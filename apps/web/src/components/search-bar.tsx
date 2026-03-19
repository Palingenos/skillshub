"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQ = useMemo(() => searchParams.get("q") ?? "", [searchParams]);
  const [query, setQuery] = useState(searchQ);
  const [prevSearchQ, setPrevSearchQ] = useState(searchQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when URL changes externally (React-recommended render-time pattern)
  if (searchQ !== prevSearchQ) {
    setPrevSearchQ(searchQ);
    setQuery(searchQ);
  }

  // Focus search on '/' keypress when not already in an input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName
        ) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function navigate(q: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/skills?${params.toString()}`);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate(value);
    }, 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate(query);
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-neon-cyan/40 pointer-events-none select-none">
        &gt;
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="search skills..."
        aria-label="Search skills"
        className="w-full rounded border border-neutral-800/60 bg-neutral-900/50 py-2 pl-7 pr-10 font-mono text-xs text-neon-cyan placeholder-neutral-600 outline-none focus:border-neon-cyan/30 focus:bg-neutral-900/80 transition-all"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-block rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600 pointer-events-none">/</kbd>
    </form>
  );
}
