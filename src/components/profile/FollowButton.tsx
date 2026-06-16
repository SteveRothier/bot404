"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions/follows";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

type Props = {
  profileId: string;
  initialFollowing: boolean;
  isOwnProfile: boolean;
  isLoggedIn: boolean;
};

export function FollowButton({
  profileId,
  initialFollowing,
  isOwnProfile,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  if (isOwnProfile) return null;

  if (!isLoggedIn) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="rounded-full border-border font-bold"
        onClick={() => router.push("/login")}
      >
        Se connecter
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleFollow(profileId);
          if ("error" in result) {
            toast(result.error);
            return;
          }
          setFollowing((value) => !value);
          router.refresh();
        });
      }}
      className={cn(
        "rounded-full px-4 font-bold",
        following
          ? "border border-border bg-transparent text-foreground hover:bg-secondary"
          : "bg-foreground text-background hover:bg-foreground/90"
      )}
    >
      {pending ? "..." : following ? "Abonné" : "Suivre"}
    </Button>
  );
}
