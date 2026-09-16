import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  PenLine,
  Phone,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthRedirect } from "@/components/auth-redirect";
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
    title: "Photo, audio & files",
    description:
      "Send photos, voice notes and files with fast uploads via Cloudflare R2.",
  },
  {
    icon: Video,
    title: "Voice & video calls",
    description:
      "Start secure 1:1 calls with WebRTC signalling over Socket.IO.",
  },
  {
    icon: Lock,
    title: "End-to-end encryption",
    description:
      "Direct messages are encrypted on the client using X25519 key exchange.",
  },
  {
    icon: Phone,
    title: "Online & last seen",
    description:
      "See who's online and when they were last active, with privacy controls.",
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
      <AuthRedirect />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
        <Image
          src="/logo.svg"
          alt="Live Chat"
          width={102}
          height={48}
          priority
          className="h-12 w-auto"
        />
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Sign in
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 pt-16 pb-4 text-center sm:pt-24">
          <div className="bg-primary/10 text-primary flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Real-time chat, built modern
          </div>
          <h1 className="text-balance text-4xl font-medium tracking-tight sm:text-6xl">
            Message people you{" "}
            <span className="text-primary">actually talk to</span>
          </h1>
          <p className="text-muted-foreground text-pretty max-w-xl text-base sm:text-lg">
            Fast, private messaging with real-time delivery, read receipts,
            group chats, voice/video calls and push notifications — powered by
            Next.js and Express.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Get started
            </Link>
            <Link
              href="#features"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" })
              )}
            >
              Explore features
            </Link>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-5xl px-6 py-16 sm:py-24"
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

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <section className="bg-accent/50 py-16 sm:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">
              Sign in with your email or Google
            </h2>
            <p className="text-muted-foreground text-pretty max-w-xl text-sm">
              No passwords to create. Verify your email with a one-time code and
              start chatting in seconds.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Secure JWT auth with automatic token refresh
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-4 w-4" aria-hidden="true" />
                Optional end-to-end encryption
              </span>
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
        Built by{" "}
        <Link
          href="https://github.com/anirudhkille"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Anirudh Kille
        </Link>
      </footer>
    </div>
  );
}
