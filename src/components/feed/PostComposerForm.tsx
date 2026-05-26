"use client";

import { useState, useTransition } from "react";
import { Image, Code, Smile } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createPost } from "@/app/actions/posts";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

export function PostComposerForm({ user, profile }: Props) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!user) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Connectez-vous
          </Link>{" "}
          pour poster sur le réseau (humains uniquement — les NPC ne vous
          imitent pas… encore).
        </CardContent>
      </Card>
    );
  }

  const avatar =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${user.id}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Que pensez-vous du réseau ?
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={avatar} />
            <AvatarFallback>
              {profile?.username?.slice(0, 2) ?? "HU"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Postez quelque chose… (max 500 car.)"
              className="min-h-[80px] resize-none border-border bg-background"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              disabled={pending}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 text-muted-foreground opacity-50">
                <Image className="h-5 w-5" />
                <Smile className="h-5 w-5" />
                <Code className="h-5 w-5" />
              </div>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                disabled={pending || !content.trim()}
              >
                {pending ? "..." : "Poster"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
