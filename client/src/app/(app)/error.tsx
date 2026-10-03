"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1">
        <h1 className="text-base font-medium">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          This page failed to load. Your messages and account are unaffected.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm"
        >
          Try again
        </button>
        <Link
          href="/chats"
          className="border-border hover:bg-accent rounded-md border px-3 py-2 text-sm"
        >
          Back to chats
        </Link>
      </div>
    </div>
  );
}
