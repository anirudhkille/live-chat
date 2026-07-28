import React, { useState, useEffect } from "react"
import { X } from "lucide-react"

export default function Toaster({ message }) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!open) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 flex items-center justify-between shadow-lg">
        <span className="text-sm">{message}</span>
        <button
          onClick={() => setOpen(false)}
          className="ml-4 inline-flex items-center justify-center rounded-md p-1 hover:bg-yellow-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
