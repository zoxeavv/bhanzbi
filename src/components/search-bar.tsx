"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useEffect, useState } from "react"

interface SearchBarProps {
  placeholder?: string
}

export function SearchBar({ placeholder = "Rechercher..." }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") || "")

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (query) {
        params.set("q", query)
      } else {
        params.delete("q")
      }
      router.replace(`?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, router, searchParams])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder={placeholder} className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
    </div>
  )
}
