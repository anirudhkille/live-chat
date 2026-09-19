import type { Metadata } from "next";

import "@fontsource-variable/geist";
import "./globals.css";

import { Toaster } from "sonner";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Live Chat",
  description:
    "Fast, simple messaging with real-time delivery, read receipts, and group chats.",
};

const themeInitScript = `
try {
  const stored = localStorage.getItem("live-chat.theme");
  const theme = stored === "light" || stored === "dark" ? stored : "system";
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
} catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
