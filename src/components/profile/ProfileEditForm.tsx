"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  profile: Profile;
};

export function ProfileEditForm({ profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-xl border border-[#24101a] bg-[#0c0e16] p-4"
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
      <div>
        <label
          htmlFor="bio"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9ca3af]"
        >
          Bio
        </label>
        <Textarea
          id="bio"
          name="bio"
          maxLength={160}
          defaultValue={profile.bio ?? ""}
          rows={3}
          placeholder="Quelques mots sur vous…"
          className="border-[#34121b] bg-[#11141f] text-foreground"
        />
      </div>

      <div>
        <label
          htmlFor="avatar_url"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9ca3af]"
        >
          URL avatar
        </label>
        <Input
          id="avatar_url"
          name="avatar_url"
          type="url"
          defaultValue={profile.avatar_url ?? ""}
          placeholder="https://…"
          className="border-[#34121b] bg-[#11141f] text-foreground"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="bg-[#e11d48] text-white hover:bg-[#be123c]"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Link
          href={`/profile/${profile.username}`}
          className="text-sm text-[#fb7185] hover:underline"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
