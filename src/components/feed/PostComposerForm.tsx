"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NarrativeQueuedBanner } from "@/components/lore/NarrativeQueuedBanner";
import {
  composerPlaceholderForFeedTab,
  postTypeForFeedTab,
  type FeedTab,
} from "@/components/feed/FeedTabs";
import { ComposerTextarea } from "@/components/feed/ComposerTextarea";
import { ComposerToolbar } from "@/components/feed/ComposerToolbar";
import { EmbeddedMedia } from "@/components/feed/EmbeddedMedia";
import { composerSubmitClassName } from "@/components/feed/composer-styles";
import { fetchFeedPostById } from "@/app/actions/feed";
import { createPost } from "@/app/actions/posts";
import { useFeedBridge } from "@/components/feed/FeedBridgeContext";
import { resolveAvatarUrl } from "@/lib/avatars";
import { extractEmbedMediaUrls } from "@/lib/embed-media";
import { NARRATIVE_COPY } from "@/lib/narrative/copy";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  feedTab: FeedTab;
};

export function PostComposerForm({ user, profile, feedTab }: Props) {
  const router = useRouter();
  const feedBridge = useFeedBridge();
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [remoteGifUrl, setRemoteGifUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsBlob, setPreviewIsBlob] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dismissQueued = useCallback(() => setQueuedMessage(null), []);

  const avatar = resolveAvatarUrl(
    profile?.avatar_url,
    user?.id ?? "guest"
  );

  const canSubmit =
    !!user &&
    (content.trim().length > 0 || !!mediaFile || !!remoteGifUrl) &&
    !pending;
  const disabled = pending || !user;
  const placeholder = composerPlaceholderForFeedTab(feedTab);
  const embedSourceUrl = extractEmbedMediaUrls(content)[0];
  const hasAttachedMedia = !!(previewUrl || mediaFile || remoteGifUrl);
  const showLinkEmbed = embedSourceUrl && !hasAttachedMedia;

  function clearMedia() {
    setMediaFile(null);
    setRemoteGifUrl(null);
    if (previewUrl && previewIsBlob) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewIsBlob(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleGifSelect(gif: { url: string; previewUrl: string }) {
    setError(null);
    setMediaFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (previewUrl && previewIsBlob) URL.revokeObjectURL(previewUrl);
    setRemoteGifUrl(gif.url);
    setPreviewUrl(gif.previewUrl);
    setPreviewIsBlob(false);
  }

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Média trop volumineux (max 2 Mo).");
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type
      )
    ) {
      setError("Format non supporté (JPEG, PNG, WebP ou GIF).");
      return;
    }

    setError(null);
    setRemoteGifUrl(null);
    setMediaFile(file);
    if (previewUrl && previewIsBlob) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewIsBlob(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const fd = new FormData();
    fd.set("content", content);
    fd.set("post_type", postTypeForFeedTab(feedTab));
    if (mediaFile) fd.set("media", mediaFile);
    else if (remoteGifUrl) fd.set("media_remote_url", remoteGifUrl);

    startTransition(async () => {
      const result = await createPost(fd);
      if (result.error) setError(result.error);
      else {
        setContent("");
        clearMedia();
        if (result.narrativeQueued) {
          setQueuedMessage(NARRATIVE_COPY.queuedInteraction);
        }
        if (result.postId) {
          const post = await fetchFeedPostById(result.postId);
          if (post) {
            const matchesTab =
              feedTab === "for-you" ||
              post.post_type === postTypeForFeedTab(feedTab);
            if (matchesTab) {
              feedBridge.prependPost(post, feedTab);
            }
          }
        }
        router.refresh();
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

          {showLinkEmbed && <EmbeddedMedia url={embedSourceUrl} />}

          {previewUrl && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Aperçu"
                className="mx-auto block max-h-64 w-full object-contain"
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

          {queuedMessage && (
            <NarrativeQueuedBanner
              message={queuedMessage}
              onDismiss={dismissQueued}
            />
          )}

          <div className="mt-1 flex items-center justify-between gap-3 px-1 pb-0.5">
            <ComposerToolbar
              onEmojiSelect={appendEmoji}
              onMediaClick={() => fileInputRef.current?.click()}
              onGifSelect={handleGifSelect}
              disabled={disabled}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
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
