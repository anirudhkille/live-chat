"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useIsDesktop } from "@/hooks/use-media-query";
import { getApiErrorMessage } from "@/types/api";
import type { CompleteProfileValues } from "@/features/auth/schemas/complete-profile-schema";
import { completeProfileSchema } from "@/features/auth/schemas/complete-profile-schema";
import { useAuthStore } from "@/store/auth-store";
import { useUpdateProfile } from "@/features/settings/hooks/use-update-profile";

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

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { name: user?.name ?? "" },
  });

  const mutation = useUpdateProfile();

  const onSubmit = (values: CompleteProfileValues) => {
    mutation.mutate(values, {
      onSuccess: (result) => {
        if (result.data.user) setUser(result.data.user);
        router.push("/settings");
      },
    });
  };

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
        <div className="flex justify-center">
          <div
            aria-hidden="true"
            className="bg-primary text-primary-foreground relative flex h-16 w-16 items-center justify-center rounded-full text-lg font-medium"
          >
            {initials(user?.name ?? user?.email ?? "?")}
            <button
              type="button"
              aria-label="Change photo"
              disabled
              title="Photo upload coming soon"
              className="bg-card absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border opacity-70"
            >
              <Camera className="text-muted-foreground h-3 w-3" />
            </button>
          </div>
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

        {mutation.isError && (
          <p role="alert" className="text-destructive text-sm">
            {getApiErrorMessage(mutation.error)}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Profile updated.
          </p>
        )}

        <Button
          type="submit"
          disabled={mutation.isPending || (!isDirty && !!user?.name)}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </form>
    </div>
  );
}
