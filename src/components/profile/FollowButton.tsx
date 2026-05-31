"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions/follows";
import { Button } from "@/components/ui/button";
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
        className="border-[#34121b] text-[#fda4af]"
        onClick={() => router.push("/login")}
      >
        Se connecter pour suivre
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
          if (!result.error) {
            setFollowing((value) => !value);
            router.refresh();
          }
        });
      }}
      className={cn(
        "font-semibold",
        following
          ? "border border-[#34121b] bg-transparent text-[#fda4af] hover:bg-[#11141f]"
          : "border-0 bg-[#e11d48] text-white hover:bg-[#be123c]"
      )}
    >
      {pending ? "..." : following ? "Abonné" : "Suivre"}
    </Button>
  );
}
