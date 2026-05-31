"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteComment } from "@/app/actions/posts";
import { cn } from "@/lib/utils";

type Props = {
  commentId: number;
  postId: number;
  canDelete: boolean;
};

export function CommentDeleteButton({
  commentId,
  postId,
  canDelete,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canDelete) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await deleteComment(commentId, postId);
          if (!result.error) {
            router.refresh();
          }
        });
      }}
      aria-label="Supprimer le commentaire"
      className={cn(
        "ml-auto shrink-0 text-[#6b7280] transition-colors hover:text-[#fda4af]",
        pending && "opacity-60"
      )}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
