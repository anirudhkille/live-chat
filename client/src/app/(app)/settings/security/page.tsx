import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SecuritySettings } from "@/features/e2e/components/security-settings";

export default function SecurityPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <Link
          href="/settings"
          aria-label="Back"
          className="inline-flex items-center justify-center p-1 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium text-foreground">Security</span>
      </header>

      <div className="flex-1 p-4">
        <SecuritySettings />
      </div>
    </div>
  );
}
