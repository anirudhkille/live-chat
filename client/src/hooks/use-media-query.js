import { useEffect, useState } from "react"

// Usage: const isDesktop = useMediaQuery("(min-width: 768px)")
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener("change", onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 768px)")
}
