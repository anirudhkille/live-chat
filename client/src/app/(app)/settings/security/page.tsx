"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SecuritySettings } from "@/features/e2e/components/security-settings";

export default function SecurityPage() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.push("/settings")}
          className="p-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">Security</span>
      </header>

      <div className="flex-1 p-4">
        <SecuritySettings />
      </div>
    </div>
  );
}
