"use client";

import { useState, useTransition } from "react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Globe,
  Image,
  Smile,
  TriangleAlert,
  Film,
} from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createPost } from "@/app/actions/posts";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

const toolbarIcons = [
  { Icon: Image, label: "Image" },
  { Icon: Film, label: "GIF" },
  { Icon: BarChart3, label: "Sondage" },
  { Icon: Smile, label: "Emoji" },
  { Icon: TriangleAlert, label: "Alerte" },
  { Icon: Calendar, label: "Calendrier" },
] as const;

export function PostComposerForm({ user, profile }: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const avatar =
    profile?.avatar_url ??
    (user
      ? `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${user.id}`
      : "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=guest");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const fd = new FormData();
    fd.set("content", content);
    startTransition(async () => {
      const result = await createPost(fd);
      if (result.error) setError(result.error);
      else setContent("");
    });
  }

  return (
    <section className="pb-4">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#24101a] bg-[#0c0e16] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] transition-colors hover:border-[#34121b] hover:bg-[#11141f]"
      >
        <div className="flex gap-3">
          <Avatar className="size-12 shrink-0 rounded-lg after:rounded-lg">
            <AvatarImage
              src={avatar}
              className="rounded-lg object-cover"
            />
            <AvatarFallback className="rounded-lg bg-[#1a0c16] text-xs text-[#fda4af]">
              {profile?.username?.slice(0, 2) ?? "??"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="relative">
              <Textarea
                placeholder="Quoi de neuf dans ce monde qui s'effondre ?"
                className="min-h-[88px] resize-none border-0 bg-transparent px-3 py-3 pr-10 text-[15px] text-foreground shadow-none placeholder:text-[#6b7280] focus-visible:border-0 focus-visible:ring-0"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                disabled={pending || !user}
              />
              <span className="pointer-events-none absolute bottom-3 right-3 text-[11px] text-[#4b5563]">
                {content.length}
              </span>
            </div>

            {error && (
              <p className="mt-1 text-sm text-destructive">{error}</p>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-[#24101a] pt-3">
              <div className="flex items-center gap-3 text-[#6b7280]">
                {toolbarIcons.map(({ Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    title="Bientôt"
                    className="transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={label}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled
                  title="Bientôt"
                  className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Globe className="size-3.5" />
                  Public
                  <ChevronDown className="size-3.5" />
                </button>

                {user ? (
                  <Button
                    type="submit"
                    disabled={pending || !content.trim()}
                    className="h-9 rounded-lg bg-[#e11d48] px-5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#be123c]"
                  >
                    {pending ? "..." : "Poster"}
                  </Button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-[#e11d48] px-5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#be123c]"
                  >
                    Poster
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
