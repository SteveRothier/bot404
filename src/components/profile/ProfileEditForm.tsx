"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isDiscordAvatarUrl } from "@/lib/avatars";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  profile: Profile;
};

export function ProfileEditForm({ profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [previewError, setPreviewError] = useState(false);

  const hasCustomUrl = avatarUrl.trim().length > 0;

  useEffect(() => {
    setPreviewError(false);
  }, [avatarUrl]);

  return (
    <form
      className="space-y-4 px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateProfile(formData);
          if (result.error) {
            setError(result.error);
            return;
          }
          router.push(`/profile/${profile.username}`);
          router.refresh();
        });
      }}
    >
      <div className="flex items-center gap-4">
        <UserAvatar
          avatarUrl={avatarUrl || null}
          fallbackSeed={profile.id}
          username={profile.username}
          allowDicebearFallback={!hasCustomUrl}
          onImageError={() => setPreviewError(true)}
          onImageLoad={() => setPreviewError(false)}
          className="size-16 rounded-full"
          imageClassName="rounded-full object-cover"
          fallbackClassName="rounded-full text-base"
        />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Aperçu de votre avatar
          </p>
          {previewError && hasCustomUrl && (
            <p className="mt-1 text-sm text-destructive">
              Impossible de charger cette image.
              {isDiscordAvatarUrl(avatarUrl)
                ? " Les liens Discord expirent — copiez un lien récent ou hébergez l’image ailleurs (Imgur, Supabase Storage…)."
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
          rows={3}
          placeholder="Quelques mots sur vous…"
          className="rounded-xl border-border bg-secondary"
        />
      </div>

      <div>
        <label htmlFor="avatar_url" className="mb-1 block text-[15px] font-bold">
          URL avatar
        </label>
        <Input
          id="avatar_url"
          name="avatar_url"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          className="rounded-xl border-border bg-secondary"
        />
        <p className="mt-1 text-meta text-muted-foreground">
          Les URLs Discord expirent : au enregistrement, l&apos;image est
          copiée sur le serveur pour un affichage permanent.
        </p>
      </div>

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
