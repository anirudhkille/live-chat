import { useMutation } from "@tanstack/react-query";

import { uploadAvatar, type AvatarUploadUrl } from "../api/user-api";

export type AvatarUploadPayload = {
  blob: Blob;
  contentType: string;
};

export function useAvatarUpload() {
  return useMutation({
    mutationFn: ({ blob, contentType }: AvatarUploadPayload) =>
      uploadAvatar(blob, contentType),
  });
}

export type { AvatarUploadUrl };
