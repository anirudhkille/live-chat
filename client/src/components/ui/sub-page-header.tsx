"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

interface SubPageHeaderProps {
  title?: string;
  href?: string;
  onBack?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const BACK_CLASS =
  "inline-flex items-center justify-center rounded-md p-1 text-foreground hover:bg-accent";

export function SubPageHeader({
  title,
  href,
  onBack,
  children,
  className,
}: SubPageHeaderProps) {
  return (
    <header className={cn("flex items-center gap-2 border-b p-3", className)}>
      {href ? (
        <Link href={href} aria-label="Back" className={BACK_CLASS}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      ) : (
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className={BACK_CLASS}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      {title && (
        <span className="text-foreground text-sm font-medium">{title}</span>
      )}
      {children}
    </header>
  );
}
