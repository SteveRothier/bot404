"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_BYTES,
} from "@/lib/avatars";
import { isDiscordAvatarUrl } from "@/lib/avatars";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  profile: Profile;
};

export function ProfileEditForm({ profile }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [clearAvatar, setClearAvatar] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [bioLength, setBioLength] = useState(profile.bio?.length ?? 0);

  const previewSource = clearAvatar
    ? null
    : previewBlobUrl ?? (avatarUrl.trim() || null);
  const hasCustomPreview = !!previewSource;

  useEffect(() => {
    setPreviewError(false);
  }, [previewSource]);

  useEffect(() => {
    if (!avatarFile) {
      setPreviewBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreviewBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function handleFileSelect(file: File | null) {
    setClearAvatar(false);
    if (!file) {
      setAvatarFile(null);
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setError("Format non supporté (JPEG, PNG, WebP, GIF).");
      setAvatarFile(null);
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image trop volumineuse (max 2 Mo).");
      setAvatarFile(null);
      return;
    }
    setError(null);
    setAvatarFile(file);
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarUrl("");
    setClearAvatar(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <form
      className="space-y-4 px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        if (avatarFile) {
          formData.set("avatar_file", avatarFile);
        }
        if (clearAvatar) {
          formData.set("clear_avatar", "1");
        }
        startTransition(async () => {
          const result = await updateProfile(formData);
          if ("error" in result) {
            setError(result.error);
            return;
          }
          router.push(`/profile/${profile.username}`);
          router.refresh();
        });
      }}
    >
      <div className="flex items-start gap-4">
        <UserAvatar
          avatarUrl={previewSource}
          fallbackSeed={profile.id}
          username={profile.username}
          allowDicebearFallback={!hasCustomPreview}
          onImageError={() => setPreviewError(true)}
          onImageLoad={() => setPreviewError(false)}
          className="size-16 shrink-0 rounded-full"
          imageClassName="rounded-full object-cover"
          fallbackClassName="rounded-full text-base"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p id="avatar-file-label" className="text-sm text-muted-foreground">
            Aperçu de votre avatar
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
            >
              Choisir une image
            </Button>
            {(hasCustomPreview || avatarFile) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                disabled={pending}
                onClick={handleRemoveAvatar}
              >
                Retirer
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            aria-labelledby="avatar-file-label"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
          {previewError && hasCustomPreview && !avatarFile && (
            <p className="text-sm text-destructive">
              Impossible de charger cette image.
              {isDiscordAvatarUrl(avatarUrl)
                ? " Les liens Discord expirent — choisissez un fichier ou un lien récent."
                : " Vérifiez que l’URL est publique et pointe vers une image."}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="mb-1 block text-[15px] font-bold">
          Bio
        </label>
        <Textarea
          id="bio"
          name="bio"
          maxLength={160}
          defaultValue={profile.bio ?? ""}
          onChange={(e) => setBioLength(e.target.value.length)}
          rows={3}
          placeholder="Quelques mots sur vous…"
          className="rounded-xl border-border bg-secondary"
        />
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
          {bioLength}/160
        </p>
      </div>

      {!avatarFile && (
      <div>
        <label htmlFor="avatar_url" className="mb-1 block text-[15px] font-bold">
          URL avatar (optionnel)
        </label>
        <Input
          id="avatar_url"
          name="avatar_url"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={avatarUrl}
          disabled={!!avatarFile}
          onChange={(e) => {
            setClearAvatar(false);
            setAvatarUrl(e.target.value);
          }}
          placeholder="https://…"
          className="rounded-xl border-border bg-secondary"
        />
        <p className="mt-1 text-meta text-muted-foreground">
          Préférez « Choisir une image » pour un avatar permanent. Les URLs
          Discord expirent ; à l&apos;enregistrement, une URL externe est copiée sur
          le serveur.
        </p>
      </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent font-bold text-accent-foreground hover:bg-accent/90"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
