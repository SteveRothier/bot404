"use client";

import { useRef, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/ui/user-avatar";
import { NarrativeQueuedBanner } from "@/components/lore/NarrativeQueuedBanner";
import {
  composerPlaceholderForFeedTab,
  postTypeForFeedTab,
  type FeedTab,
} from "@/components/feed/FeedTabs";
import { ComposerTextarea } from "@/components/feed/ComposerTextarea";
import { ComposerToolbar } from "@/components/feed/ComposerToolbar";
import { EmbeddedMedia } from "@/components/feed/EmbeddedMedia";
import {
  createDefaultPollDraft,
  PollComposer,
  type PollDraftState,
} from "@/components/feed/PollComposer";
import { composerSubmitClassName } from "@/components/feed/composer-styles";
import { fetchFeedPostById } from "@/app/actions/feed";
import { createPost } from "@/app/actions/posts";
import { useFeedBridge } from "@/components/feed/FeedBridgeContext";
import { extractEmbedMediaUrls } from "@/lib/embed-media";
import {
  POLL_MIN_OPTIONS,
  validatePollDraft,
} from "@/lib/polls";
import { NARRATIVE_COPY } from "@/lib/narrative/copy";
import type { Profile } from "@/lib/supabase/types";

const POST_MAX_LENGTH = 500;

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
  const [pollDraft, setPollDraft] = useState<PollDraftState | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dismissQueued = useCallback(() => setQueuedMessage(null), []);

  const embedSourceUrl = extractEmbedMediaUrls(content)[0];
  const hasAttachedMedia = !!(previewUrl || mediaFile || remoteGifUrl);
  const showLinkEmbed = embedSourceUrl && !hasAttachedMedia && !pollDraft;
  const filledPollChoices =
    pollDraft?.optionFields.filter((o) => o.trim().length > 0).length ?? 0;
  const pollValidationError = pollDraft
    ? validatePollDraft({
        options: pollDraft.optionFields.map((o) => o.trim()).filter(Boolean),
        durationMinutes: pollDraft.durationMinutes,
      })
    : null;
  const pollReady =
    !!pollDraft &&
    content.trim().length > 0 &&
    filledPollChoices >= POLL_MIN_OPTIONS &&
    !pollValidationError;
  const canSubmit =
    !!user &&
    !pending &&
    (pollReady ||
      (!pollDraft &&
        (content.trim().length > 0 || !!mediaFile || !!remoteGifUrl)));
  const disabled = pending || !user;
  const placeholder = user
    ? composerPlaceholderForFeedTab(feedTab)
    : "Connectez-vous pour publier…";
  const submitHint = pollDraft
    ? pollValidationError ??
      (content.trim().length === 0
        ? "Ajoutez un message au sondage"
        : filledPollChoices < POLL_MIN_OPTIONS
          ? `${POLL_MIN_OPTIONS} choix minimum`
          : null)
    : null;

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
    setPollDraft(null);
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
    setPollDraft(null);
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
    if (pollDraft) {
      fd.set(
        "poll_json",
        JSON.stringify({
          options: pollDraft.optionFields.map((o) => o.trim()).filter(Boolean),
          durationMinutes: pollDraft.durationMinutes,
        })
      );
    }

    startTransition(async () => {
      const result = await createPost(fd);
      if (result.error) setError(result.error);
      else {
        setContent("");
        clearMedia();
        setPollDraft(null);
        if (result.narrativeQueued) {
          setQueuedMessage(NARRATIVE_COPY.queuedInteraction);
        }
        if (result.postId) {
          const fetched = await fetchFeedPostById(result.postId);
          const post =
            fetched && result.poll
              ? { ...fetched, poll: fetched.poll ?? result.poll }
              : fetched;
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

  if (!user) {
    return (
      <section className="border-b border-border px-4 py-4">
        <div className="flex items-start gap-3 opacity-60">
          <UserAvatar
            avatarUrl={null}
            fallbackSeed="guest"
            username="?"
            className="size-10 shrink-0 rounded-lg"
            imageClassName="rounded-lg object-cover"
            fallbackClassName="rounded-lg bg-transparent"
          />
          <div className="min-w-0 flex-1 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-3">
            <p className="text-[15px] text-muted-foreground">
              <Link href="/login" className="font-bold text-accent hover:underline">
                Connectez-vous
              </Link>{" "}
              pour publier un signal, une théorie ou un sondage.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border px-4 py-4">
      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <UserAvatar
          avatarUrl={profile?.avatar_url}
          fallbackSeed={user.id}
          username={profile?.username ?? "??"}
          className="size-10 shrink-0 rounded-lg"
          imageClassName="rounded-lg object-cover"
          fallbackClassName="rounded-lg bg-transparent"
        />

        <div className="min-w-0 flex-1">
          <ComposerTextarea
            placeholder={placeholder}
            value={content}
            onChange={setContent}
            maxLength={POST_MAX_LENGTH}
            disabled={disabled}
          />

          <p className="px-1 text-right text-xs tabular-nums text-muted-foreground">
            {content.length}/{POST_MAX_LENGTH}
          </p>

          {showLinkEmbed && <EmbeddedMedia url={embedSourceUrl} />}

          {pollDraft && (
            <PollComposer
              draft={pollDraft}
              onChange={setPollDraft}
              onRemove={() => setPollDraft(null)}
              disabled={disabled}
            />
          )}

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
            <p className="mt-1 px-1 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {pollDraft && submitHint && (
            <p className="mt-1 px-1 text-sm text-muted-foreground">{submitHint}</p>
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
              onPollClick={() => {
                setError(null);
                clearMedia();
                setPollDraft((current) => current ?? createDefaultPollDraft());
              }}
              pollActive={!!pollDraft}
              mediaDisabled={hasAttachedMedia || !!embedSourceUrl}
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

            <button
              type="submit"
              disabled={!canSubmit}
              title={submitHint ?? undefined}
              className={composerSubmitClassName(canSubmit)}
            >
              {pending ? "..." : pollDraft && !canSubmit ? "Complétez le sondage" : "Émettre"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
