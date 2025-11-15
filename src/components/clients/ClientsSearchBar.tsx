"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Toolbar } from "@/components/ui/Toolbar";
import { Search } from "lucide-react";

interface ClientsSearchBarProps {
  onSearchChange: (searchTerm: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

/**
 * Hook personnalisé pour debounce une valeur
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Barre de recherche pour les clients avec debounce
 * 
 * Gère l'input de recherche et déclenche le callback avec debounce.
 */
export function ClientsSearchBar({
  onSearchChange,
  isLoading = false,
  placeholder = "Rechercher un client (nom, société, email)...",
}: ClientsSearchBarProps) {
  const [search, setSearch] = useState("");

  // Debounce de la recherche (400ms)
  const debouncedSearch = useDebounce(search, 400);

  // Appeler le callback quand la valeur debounced change
  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  return (
    <Toolbar>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </Toolbar>
  );
}


