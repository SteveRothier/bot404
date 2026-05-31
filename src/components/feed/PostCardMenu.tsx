"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { deletePost } from "@/app/actions/posts";
import { cn } from "@/lib/utils";

type Props = {
  postId: number;
  canDelete: boolean;
};

export function PostCardMenu({ postId, canDelete }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!canDelete) return null;

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Options"
        className="flex items-center p-0 text-[#6b7280] transition-colors hover:text-[#fda4af]"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-36 overflow-hidden rounded-lg border border-[#34121b] bg-[#0c0e16] shadow-lg">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await deletePost(postId);
                if (!result.error) {
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
            className={cn(
              "block w-full px-3 py-2 text-left text-sm text-[#fda4af] transition-colors hover:bg-[#11141f]",
              pending && "opacity-60"
            )}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
