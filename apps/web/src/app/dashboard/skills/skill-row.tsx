"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, ExternalLink } from "lucide-react";

interface SkillRowProps {
  skillId: string;
  name: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  editHref: string;
  viewHref: string;
}

export function SkillRow({
  skillId,
  name,
  slug,
  description,
  isPublished,
  editHref,
  viewHref,
}: SkillRowProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/skills/${skillId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      console.error("Failed to delete skill");
    }
    setDeleting(false);
    setShowConfirm(false);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-neutral-900/30 transition-colors group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={viewHref}
            className="font-mono text-xs text-neutral-300 hover:text-neon-cyan transition-colors truncate"
          >
            <span className="text-neutral-600">&gt;</span> {name}
          </Link>
          <Link
            href={viewHref}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-700 hover:text-neon-cyan"
          >
            <ExternalLink className="h-3 w-3" />
          </Link>
          {!isPublished && (
            <span className="font-mono text-[9px] text-neon-orange/60 border border-neon-orange/20 px-1.5 py-0.5 rounded">
              draft
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 font-mono text-[10px] text-neutral-600 truncate max-w-lg">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-3">
        <Link
          href={editHref}
          className="flex h-7 w-7 items-center justify-center rounded border border-neutral-800/40 text-neutral-600 hover:text-neon-cyan hover:border-neon-cyan/30 transition-colors"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </Link>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex h-7 w-7 items-center justify-center rounded border border-neutral-800/40 text-neutral-600 hover:text-red-400 hover:border-red-500/30 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded border border-red-500/30 bg-red-500/5 px-2 py-1 font-mono text-[10px] text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-all"
            >
              {deleting ? "..." : "delete"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded border border-neutral-800/40 px-2 py-1 font-mono text-[10px] text-neutral-600 hover:text-neutral-400"
            >
              no
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
