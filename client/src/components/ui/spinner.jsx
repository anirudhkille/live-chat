import { cn } from "../../lib/utils"

function Spinner({ className }) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  )
}

export { Spinner }
