import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 p-4">
        <div className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-md">
          <MessageCircle className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">Live Chat</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Message people you actually talk to
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Fast, simple messaging with real-time delivery, read receipts, and
          group chats.
        </p>
        <div className="mt-2 flex gap-2">
          <Link href="/login" className={cn(buttonVariants())}>
            Get started
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Sign in
          </Link>
        </div>
      </main>

      <footer className="text-muted-foreground p-4 text-center text-xs">
        Built by Anirudh Kille
      </footer>
    </div>
  );
}
