"use client";

import "react-easy-crop/react-easy-crop.css";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCroppedAvatarBlob } from "@/lib/crop-image";

interface AvatarCropDialogProps {
  imageSrc: string;
  onClose: () => void;
  onConfirm: (blob: Blob, contentType: string) => void;
}

export function AvatarCropDialog({
  imageSrc,
  onClose,
  onConfirm,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback(
    (_area: Area, pixels: Area) => setCroppedAreaPixels(pixels),
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedAvatarBlob(imageSrc, croppedAreaPixels);
      onConfirm(blob, "image/jpeg");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop profile photo"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-sm overflow-hidden rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b p-4">
          <h2 className="text-sm font-medium">Crop your photo</h2>
        </div>

        <div className="relative h-72 w-full">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-3">
          <span className="text-muted-foreground text-xs">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className={cn(
              "bg-input accent-primary h-1.5 w-full cursor-pointer appearance-none rounded-full"
            )}
          />
        </div>

        <div className="flex justify-end gap-2 border-t p-3">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing ? "Applying…" : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
