"use client";

import { Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallType } from "./call-store";

export function CallButtons({
  disabled,
  onStart,
}: {
  disabled?: boolean;
  onStart: (type: CallType) => void;
}) {
  const handleStart = (type: CallType) => {
    onStart(type);
  };

  return (
    <div className="ml-auto flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Voice call"
        disabled={disabled}
        onClick={() => handleStart("voice")}
      >
        <Phone className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Video call"
        disabled={disabled}
        onClick={() => handleStart("video")}
      >
        <Video className="h-4 w-4" />
      </Button>
    </div>
  );
}
