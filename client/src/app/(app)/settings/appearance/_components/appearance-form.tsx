"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Monitor, Moon, Sun, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/features/users/hooks/useUserPreferences";
import { useWallpaperUpload } from "@/features/users/hooks/useWallpaperUpload";
import { getApiErrorMessage } from "@/types/api";
import { IMAGE_ACCEPT, validateImageFile } from "@/lib/images";
import type { ThemePreference } from "@/lib/theme";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const WALLPAPER_COLORS = [
  "#DADBD4",
  "#E8DCC8",
  "#D6E6D2",
  "#BFE0DC",
  "#BED3E8",
  "#DCD0E8",
  "#EBC6C6",
  "#F5E0C3",
];

type PendingImage = {
  preview: string;
  file: File;
};

export function AppearanceForm() {
  const router = useRouter();
  const { theme: savedTheme, setTheme: applyTheme } = useTheme();
  const { data: preferences } = useUserPreferences();
  const prefsMutation = useUpdateUserPreferences();
  const wallpaperMutation = useWallpaperUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPreviewRef = useRef<string | null>(null);
  const themeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [theme, setThemeDraft] = useState<ThemePreference>(savedTheme);
  const [color, setColor] = useState<string | null>(
    preferences?.chatWallpaperColor ?? null
  );
  const [imageUrl, setImageUrl] = useState<string | null>(
    preferences?.chatWallpaperUrl ?? null
  );
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [edited, setEdited] = useState(false);
  const [prevPreferences, setPrevPreferences] = useState(preferences);

  if (preferences !== prevPreferences) {
    setPrevPreferences(preferences);
    if (!edited && preferences !== undefined) {
      setColor(preferences.chatWallpaperColor ?? null);
      setImageUrl(preferences.chatWallpaperUrl ?? null);
    }
  }

  useEffect(() => {
    pendingPreviewRef.current = pendingImage?.preview ?? null;
  }, [pendingImage]);

  useEffect(() => {
    return () => {
      if (pendingPreviewRef.current) {
        URL.revokeObjectURL(pendingPreviewRef.current);
      }
    };
  }, []);

  const handleThemeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = THEME_OPTIONS.findIndex((o) => o.value === theme);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    setThemeDraft(THEME_OPTIONS[nextIndex].value);
    themeRefs.current[nextIndex]?.focus();
  };

  const baseColor = preferences?.chatWallpaperColor ?? null;
  const baseUrl = preferences?.chatWallpaperUrl ?? null;
  const isDirty =
    theme !== savedTheme ||
    color !== baseColor ||
    imageUrl !== baseUrl ||
    pendingImage !== null;
  const isSaving = prefsMutation.isPending || wallpaperMutation.isPending;

  const previewBg = pendingImage?.preview ?? imageUrl;

  const handleFileSelected = (file: File | undefined) => {
    setFileError(null);
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setFileError(error);
      return;
    }

    setEdited(true);
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return { preview: URL.createObjectURL(file), file };
    });
    setColor(null);
    setImageUrl(null);
  };

  const handleRemoveWallpaper = () => {
    setEdited(true);
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });
    setColor(null);
    setImageUrl(null);
    setFileError(null);
  };

  const onSubmit = async () => {
    setSaveError(null);
    try {
      if (pendingImage) {
        await wallpaperMutation.mutateAsync({
          blob: pendingImage.file,
          contentType: pendingImage.file.type,
        });
        await prefsMutation.mutateAsync({ chatWallpaperColor: null });
      } else {
        await prefsMutation.mutateAsync({
          chatWallpaperUrl: imageUrl,
          chatWallpaperColor: color,
        });
      }
      applyTheme(theme);
      router.push("/settings");
    } catch (error) {
      setSaveError(getApiErrorMessage(error));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      className="mx-auto flex w-full max-w-sm flex-col gap-6"
    >
      <section>
        <p className="text-muted-foreground mb-2 text-[11px] tracking-wide uppercase">
          Theme
        </p>
        <div
          role="radiogroup"
          aria-label="Theme"
          onKeyDown={handleThemeKeyDown}
          className="grid grid-cols-3 gap-1"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }, index) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                ref={(el) => {
                  themeRefs.current[index] = el;
                }}
                onClick={() => setThemeDraft(value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <p className="text-muted-foreground mb-2 text-[11px] tracking-wide uppercase">
          Chat wallpaper
        </p>
        <div className="grid gap-3">
          <div
            className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg border"
            style={{
              backgroundColor: color ?? undefined,
              backgroundImage: previewBg ? `url(${previewBg})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!previewBg && !color && (
              <span className="text-muted-foreground text-xs">
                No wallpaper
              </span>
            )}
            {(previewBg || color) && (
              <button
                type="button"
                aria-label="Remove wallpaper"
                onClick={handleRemoveWallpaper}
                className="bg-background/80 absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div role="group" aria-label="Wallpaper colors">
            <div className="grid grid-cols-8 gap-2">
              {WALLPAPER_COLORS.map((swatch) => {
                const active = color === swatch && pendingImage === null;
                return (
                  <button
                    key={swatch}
                    type="button"
                    aria-label={`Wallpaper color ${swatch}`}
                    aria-pressed={active}
                    onClick={() => {
                      setEdited(true);
                      setColor(swatch);
                      setPendingImage((prev) => {
                        if (prev) URL.revokeObjectURL(prev.preview);
                        return null;
                      });
                      setImageUrl(null);
                      setFileError(null);
                    }}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md border transition-transform",
                      active
                        ? "ring-ring border-primary ring-2"
                        : "hover:scale-110"
                    )}
                    style={{ backgroundColor: swatch }}
                  >
                    {active && <Check className="h-4 w-4 text-emerald-950" />}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Upload photo
          </Button>
          {fileError && (
            <p role="alert" className="text-destructive text-xs">
              {fileError}
            </p>
          )}
        </div>
      </section>

      {saveError && (
        <p role="alert" className="text-destructive text-sm">
          {saveError}
        </p>
      )}

      <Button type="submit" disabled={!isDirty || isSaving}>
        {isSaving ? (
          <>
            <Spinner size="sm" />
            Saving…
          </>
        ) : (
          "Save"
        )}
      </Button>
    </form>
  );
}
