import type { Metadata } from "next";

import "@fontsource-variable/geist";
import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Live Chat",
  description:
    "Fast, simple messaging with real-time delivery, read receipts, and group chats.",
};

const themeInitScript = `
try {
  const stored = localStorage.getItem("live-chat.theme");
  const dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
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
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
