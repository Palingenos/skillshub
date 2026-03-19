"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

interface RepoActionsProps {
  repoId: string;
  repoName: string;
  username: string;
}

export function RepoActions({ repoId, repoName }: RepoActionsProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newName, setNewName] = useState(repoName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRename() {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Failed to rename");
        return;
      }
      setShowRename(false);
      setShowMenu(false);
      router.refresh();
    } catch {
      setError("Failed to rename repo");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Failed to delete");
        return;
      }
      setShowDelete(false);
      setShowMenu(false);
      router.refresh();
    } catch {
      setError("Failed to delete repo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex h-8 w-8 items-center justify-center rounded border border-neutral-800/40 text-neutral-600 hover:text-neutral-300 hover:border-neutral-700 transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowRename(false); setShowDelete(false); }} />
          <div className="absolute right-0 top-10 z-50 w-48 rounded border border-neutral-800/60 bg-[#0a0a0a] py-1 shadow-xl">
            <button
              onClick={() => { setShowRename(true); setShowDelete(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-neutral-400 hover:bg-neutral-900 hover:text-neon-cyan transition-colors"
            >
              <Pencil className="h-3 w-3" />
              rename repo
            </button>
            <button
              onClick={() => { setShowDelete(true); setShowRename(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-neutral-400 hover:bg-red-950/30 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              delete repo
            </button>
          </div>
        </>
      )}

      {/* Rename modal */}
      {showRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded border border-neutral-800/60 bg-[#0a0a0a] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-neutral-200">rename repo</h3>
              <button onClick={() => { setShowRename(false); setShowMenu(false); }} className="text-neutral-600 hover:text-neutral-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded border border-neutral-800/40 bg-[#050505] px-3 py-2 font-mono text-sm text-neutral-200 outline-none focus:border-neon-cyan/30"
              autoFocus
            />
            {error && <p className="mt-2 font-mono text-xs text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRename}
                disabled={loading || !newName.trim()}
                className="flex-1 rounded border border-neon-cyan/30 bg-neon-cyan/5 py-2 font-mono text-xs text-neon-cyan hover:bg-neon-cyan/10 disabled:opacity-50 transition-all"
              >
                {loading ? "saving..." : "save"}
              </button>
              <button
                onClick={() => { setShowRename(false); setShowMenu(false); }}
                className="rounded border border-neutral-800/40 px-4 py-2 font-mono text-xs text-neutral-600 hover:text-neutral-400"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded border border-red-900/30 bg-[#0a0a0a] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-red-400">delete repo</h3>
              <button onClick={() => { setShowDelete(false); setShowMenu(false); }} className="text-neutral-600 hover:text-neutral-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="font-mono text-xs text-neutral-400 leading-relaxed">
              this will permanently delete <strong className="text-neutral-200">{repoName}</strong> and all its skills. this cannot be undone.
            </p>
            {error && <p className="mt-2 font-mono text-xs text-red-400">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded border border-red-500/30 bg-red-500/5 py-2 font-mono text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-all"
              >
                {loading ? "deleting..." : "yes, delete everything"}
              </button>
              <button
                onClick={() => { setShowDelete(false); setShowMenu(false); }}
                className="rounded border border-neutral-800/40 px-4 py-2 font-mono text-xs text-neutral-600 hover:text-neutral-400"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
