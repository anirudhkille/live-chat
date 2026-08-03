import { X, BellOff, Ban, Flag } from "lucide-react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function PanelBody({ onClose }) {
  return (
    <div className="flex h-full w-full flex-col p-4">
      <button onClick={onClose} aria-label="Close" className="mb-4 self-start p-1">
        <X className="h-4 w-4" />
      </button>

      <div className="mb-4 flex flex-col items-center">
        <div className="h-14 w-14 rounded-full bg-muted" />
        <p className="mt-2 text-sm font-medium">Priya Sharma</p>
        <p className="text-xs text-green-600">Online</p>
      </div>

      <div className="border-t py-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          Shared media
        </p>
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-muted" />
          ))}
        </div>
      </div>

      <div className="border-t py-2">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent">
          <BellOff className="h-4 w-4 text-muted-foreground" />
          Mute notifications
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-destructive hover:bg-accent">
          <Ban className="h-4 w-4" />
          Block
        </button>
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-destructive hover:bg-accent">
          <Flag className="h-4 w-4" />
          Report
        </button>
      </div>
    </div>
  )
}

export function ChatInfoPanel({ onClose, inline = false }) {
  if (inline) {
    return (
      <aside className={cn("h-full w-72 shrink-0 border-l bg-card")}>
        <PanelBody onClose={onClose} />
      </aside>
    )
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-80 p-0">
        <PanelBody onClose={onClose} />
      </SheetContent>
    </Sheet>
  )
}
