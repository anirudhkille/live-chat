"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-8 w-8 text-xs",
  sm: "h-9 w-9 text-xs",
  md: "h-14 w-14 text-base",
  lg: "h-16 w-16 text-lg",
} as const;

const VARIANTS = {
  primary: "bg-primary text-primary-foreground",
  muted: "bg-muted text-muted-foreground",
} as const;

type AvatarSize = keyof typeof SIZES;
type AvatarVariant = keyof typeof VARIANTS;

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

export interface AvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: AvatarSize;
  variant?: AvatarVariant;
  className?: string;
}

export function Avatar({
  name,
  email,
  src,
  size = "sm",
  variant = "muted",
  className,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = src && !imageFailed ? src : null;

  return (
    <div
      data-slot="avatar"
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials(name ?? email ?? "?")
      )}
    </div>
  );
}
