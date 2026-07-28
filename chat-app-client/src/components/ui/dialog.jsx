import React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "../../lib/utils"

function Dialog({ open, onClose, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/50 z-40" />
      <DialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center outline-none">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mx-4 max-w-md w-full">
          {children}
        </div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Root>
  )
}

function DialogTitle({ className, children }) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  )
}

function DialogContent({ className, children }) {
  return (
    <div className={cn("py-4", className)}>
      {children}
    </div>
  )
}

function DialogDescription({ className, children }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  )
}

function DialogFooter({ className, children }) {
  return (
    <div className={cn("flex justify-end gap-2 pt-4", className)}>
      {children}
    </div>
  )
}

export { Dialog, DialogTitle, DialogContent, DialogDescription, DialogFooter }
