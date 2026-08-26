"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft, Search as SearchIcon, SearchX } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useIsDesktop } from "@/hooks/use-media-query"

export default function SearchPage() {
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
        <div className="flex flex-1 items-center gap-2 rounded-md bg-muted px-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats and messages"
            aria-label="Search chats and messages"
            className="border-none bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <SearchX className="h-8 w-8" />
        <p className="text-sm">
          {query ? `No results for “${query}”` : "Nothing to search yet"}
        </p>
        <p className="max-w-xs text-xs">
          People and message search will appear once the chat API is connected.
        </p>
      </div>
    </div>
  )
}
