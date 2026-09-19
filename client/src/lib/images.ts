export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const IMAGE_TYPE_ERROR = "Please choose a JPG, PNG, or WebP image.";
export const IMAGE_SIZE_ERROR = "Image must be 5MB or smaller.";

export function validateImageFile(
  file: File,
  maxSize = MAX_IMAGE_SIZE
): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return IMAGE_TYPE_ERROR;
  if (file.size > maxSize) return IMAGE_SIZE_ERROR;
  return null;
}
