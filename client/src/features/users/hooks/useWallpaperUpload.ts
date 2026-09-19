import { useMutation } from "@tanstack/react-query";

import { uploadWallpaper, type WallpaperUploadUrl } from "../api/user-api";

export type WallpaperUploadPayload = {
  blob: Blob;
  contentType: string;
};

export function useWallpaperUpload() {
  return useMutation({
    mutationFn: ({ blob, contentType }: WallpaperUploadPayload) =>
      uploadWallpaper(blob, contentType),
  });
}

export type { WallpaperUploadUrl };
