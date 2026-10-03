"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="space-y-1">
            <h1 className="text-base font-medium">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              The app hit an unexpected error and had to restart this view.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
