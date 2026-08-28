"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarCropDialog } from "@/components/avatar/avatar-crop-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useIsDesktop } from "@/hooks/use-media-query";
import { getApiErrorMessage } from "@/types/api";
import type { CompleteProfileValues } from "@/features/auth/schemas/complete-profile-schema";
import { completeProfileSchema } from "@/features/auth/schemas/complete-profile-schema";
import { useAuthStore } from "@/store/auth-store";
import { useUpdateProfile } from "@/features/settings/hooks/use-update-profile";
import { useAvatarUpload } from "@/features/users/hooks/useAvatarUpload";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

type PendingAvatar = {
  src: string;
  blob: Blob;
  contentType: string;
};

function initials(source: string) {
  return (
    source
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar | null>(
    null
  );
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { name: user?.name ?? "" },
  });

  const mutation = useUpdateProfile();
  const avatarMutation = useAvatarUpload();

  const handleFileSelected = (file: File | undefined) => {
    setFileError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError("Image must be 5MB or smaller.");
      return;
    }

    setCropImageSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = useCallback((blob: Blob, contentType: string) => {
    setPendingAvatar((prev) => {
      if (prev) URL.revokeObjectURL(prev.src);
      return { src: URL.createObjectURL(blob), blob, contentType };
    });
    setCropImageSrc(null);
  }, []);

  const onSubmit = async (values: CompleteProfileValues) => {
    setSaveError(null);
    try {
      const namePromise = mutation.mutateAsync(values);
      const avatarPromise = pendingAvatar
        ? avatarMutation.mutateAsync({
            blob: pendingAvatar.blob,
            contentType: pendingAvatar.contentType,
          })
        : null;

      const [nameResult, avatarResult] = await Promise.all([
        namePromise,
        avatarPromise,
      ]);

      const nextUser = {
        ...user,
        ...(avatarResult?.data ?? {}),
        ...(nameResult?.data.user ?? {}),
      };
      setUser(nextUser);
      router.push("/settings");
    } catch (error) {
      setSaveError(getApiErrorMessage(error));
    }
  };

  const saveDisabled =
    mutation.isPending ||
    avatarMutation.isPending ||
    (!isDirty && !pendingAvatar);

  const avatarSrc = pendingAvatar?.src ?? user?.avatar ?? null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/settings")}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-medium">Edit profile</span>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6"
      >
        <div className="flex flex-col items-center gap-2">
          <div
            aria-hidden="true"
            className="bg-primary text-primary-foreground relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-lg font-medium"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials(user?.name ?? user?.email ?? "?")
            )}
            <button
              type="button"
              aria-label="Change photo"
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
              className="bg-card absolute right-1 bottom-1 flex h-6 w-6 items-center justify-center rounded-full border"
            >
              <Camera className="text-muted-foreground h-3 w-3" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {fileError && (
            <p role="alert" className="text-destructive text-xs">
              {fileError}
            </p>
          )}
        </div>

        <FormField
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          registration={register("name")}
          error={errors.name}
        />

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} disabled readOnly />
          <p className="text-muted-foreground text-xs">
            Email can&apos;t be changed
          </p>
        </div>

        {(mutation.isError || avatarMutation.isError) && (
          <p role="alert" className="text-destructive text-sm">
            {getApiErrorMessage(mutation.error ?? avatarMutation.error)}
          </p>
        )}
        {saveError && (
          <p role="alert" className="text-destructive text-sm">
            {saveError}
          </p>
        )}
        {mutation.isSuccess && !mutation.isPending && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Profile updated.
          </p>
        )}

        <Button type="submit" disabled={saveDisabled}>
          {mutation.isPending || avatarMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </form>

      {cropImageSrc && (
        <AvatarCropDialog
          imageSrc={cropImageSrc}
          onClose={() => {
            URL.revokeObjectURL(cropImageSrc);
            setCropImageSrc(null);
          }}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
