import Link from "next/link";
import {
  Bell,
  CheckCheck,
  KeyRound,
  Mail,
  MessageSquare,
  PenLine,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Users,
    title: "Direct & group chats",
    description:
      "Message one person or bring your whole team together in group conversations.",
  },
  {
    icon: Zap,
    title: "Real-time delivery",
    description:
      "Messages appear instantly over Socket.IO the moment they're sent — no refreshes.",
  },
  {
    icon: CheckCheck,
    title: "Read receipts",
    description:
      "Know when your messages are delivered and read with clear status indicators.",
  },
  {
    icon: PenLine,
    title: "Typing indicators",
    description:
      "See when someone is typing a reply before it lands on your screen.",
  },
  {
    icon: Smile,
    title: "Reactions & replies",
    description:
      "React with emoji and reply inline to keep every conversation on topic.",
  },
  {
    icon: MessageSquare,
    title: "Photo & file sharing",
    description:
      "Send photos and files with fast, reliable uploads via Cloudflare R2.",
  },
  {
    icon: Bell,
    title: "Push notifications",
    description:
      "Never miss a message — get notified even when you're not looking at the app.",
  },
  {
    icon: Mail,
    title: "Simple sign-in",
    description:
      "Passwordless email OTP or Google sign-in. No password to remember.",
  },
  {
    icon: ShieldCheck,
    title: "Secure auth",
    description:
      "Short-lived JWT access tokens with automatic refresh rotation.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
        <img
          src="/logo.svg"
          alt="Live Chat"
          width={102}
          height={48}
          className="h-12 w-auto"
        />
        <ThemeToggle />
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 pt-16 pb-4 text-center sm:pt-24">
          <h1 className="text-balance text-3xl font-medium tracking-tight sm:text-5xl">
            Message people you actually talk to
          </h1>
          <p className="text-muted-foreground text-pretty max-w-xl text-sm sm:text-base">
            Fast, private messaging with real-time delivery, read receipts, group
            chats, and push notifications — from a full-stack app built with
            Next.js and Express.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Get started
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Sign in
            </Link>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-5xl px-6 py-16 sm:py-20"
        >
          <div className="mb-10 text-center">
            <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">
              Everything you need to stay in touch
            </h2>
            <p className="text-muted-foreground text-pretty mx-auto mt-2 max-w-xl text-sm">
              Live Chat combines modern messaging with secure, real-time
              infrastructure — out of the box.
            </p>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="border-input hover:bg-accent rounded-xl border p-5 transition-colors"
              >
                <div className="bg-primary/10 text-primary mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-balance text-base font-medium">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-accent/50 py-16 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">
              Sign in with your email or Google
            </h2>
            <p className="text-muted-foreground text-pretty max-w-xl text-sm">
              No passwords to create. Verify your email with a one-time code and
              start chatting in seconds.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Secure JWT auth with automatic token refresh
            </div>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }), "mt-2")}
            >
              Get started now
            </Link>
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground border-t p-4 text-center text-xs">
        Built by Anirudh Kille
      </footer>
    </div>
  );
}
