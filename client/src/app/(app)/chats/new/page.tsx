"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, UserRoundPlus } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useIsDesktop } from "@/hooks/use-media-query"

export default function NewChatPage() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [query, setQuery] = useState("")

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-medium">New chat</span>
      </header>

      <div className="p-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search contacts"
          aria-label="Search contacts"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <UserRoundPlus className="h-8 w-8" />
        <p className="text-sm">No contacts found</p>
        <p className="max-w-xs text-xs">
          Contact search will appear here once the users API is connected.
        </p>
      </div>
    </div>
  )
}
