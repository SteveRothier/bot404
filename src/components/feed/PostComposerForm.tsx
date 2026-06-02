"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  composerPlaceholderForFeedTab,
  postTypeForFeedTab,
  type FeedTab,
} from "@/components/feed/FeedTabs";
import { ComposerTextarea } from "@/components/feed/ComposerTextarea";
import { ComposerToolbar } from "@/components/feed/ComposerToolbar";
import { composerSubmitClassName } from "@/components/feed/composer-styles";
import { createPost } from "@/app/actions/posts";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  feedTab: FeedTab;
};

export function PostComposerForm({ user, profile, feedTab }: Props) {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatar =
    profile?.avatar_url ??
    (user
      ? `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${user.id}`
      : "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=guest");

  const canSubmit =
    !!user && (content.trim().length > 0 || !!mediaFile) && !pending;
  const disabled = pending || !user;
  const placeholder = composerPlaceholderForFeedTab(feedTab);

  function clearMedia() {
    setMediaFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image trop volumineuse (max 2 Mo).");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format non supporté (JPEG, PNG ou WebP).");
      return;
    }

    setError(null);
    setMediaFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const fd = new FormData();
    fd.set("content", content);
    fd.set("post_type", postTypeForFeedTab(feedTab));
    if (mediaFile) fd.set("media", mediaFile);

    startTransition(async () => {
      const result = await createPost(fd);
      if (result.error) setError(result.error);
      else {
        setContent("");
        clearMedia();
      }
    });
  }

  function appendEmoji(emoji: string) {
    setContent((c) => c + emoji);
  }

  return (
    <section className="border-b border-border px-4 py-4">
      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0 rounded-lg">
          <AvatarImage src={avatar} className="rounded-lg object-cover" />
          <AvatarFallback className="rounded-lg bg-transparent text-xs text-muted-foreground">
            {profile?.username?.slice(0, 2) ?? "??"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <ComposerTextarea
            placeholder={placeholder}
            value={content}
            onChange={setContent}
            maxLength={500}
            disabled={disabled}
          />

          {previewUrl && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Aperçu"
                className="max-h-64 w-full object-cover"
              />
              <button
                type="button"
                onClick={clearMedia}
                className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-1 text-xs text-foreground"
              >
                Retirer
              </button>
            </div>
          )}

          {error && (
            <p className="mt-1 px-1 text-sm text-destructive">{error}</p>
          )}

          <div className="mt-1 flex items-center justify-between gap-3 px-1 pb-0.5">
            <ComposerToolbar
              onEmojiSelect={appendEmoji}
              onMediaClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleMediaSelect}
              aria-hidden
            />

            {user ? (
              <button
                type="submit"
                disabled={!canSubmit}
                className={composerSubmitClassName(canSubmit)}
              >
                {pending ? "..." : "Émettre"}
              </button>
            ) : (
              <Link href="/login" className={composerSubmitClassName(true)}>
                Émettre
              </Link>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
