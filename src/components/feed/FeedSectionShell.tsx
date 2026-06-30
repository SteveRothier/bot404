"use client";

import Link from "next/link";
import { createContext, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FeedBridgeProvider,
} from "@/components/feed/FeedBridgeContext";
import {
  FeedFollowingContext,
} from "@/components/feed/FeedFollowingContext";
import { PostComposerForm } from "@/components/feed/PostComposerForm";
import { FeedTabs, type FeedTab } from "@/components/feed/FeedTabs";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  feedTabToSearchParam,
  parseFeedTabParam,
} from "@/lib/feed/feed-tab-params";
import type { Profile } from "@/lib/supabase/types";

export const FeedTabContext = createContext<FeedTab>("for-you");

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  initialTab?: FeedTab;
  children: React.ReactNode;
};

export function FeedSectionShell({
  user,
  profile,
  initialTab = "for-you",
  children,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [followingHasPosts, setFollowingHasPosts] = useState(true);

  useEffect(() => {
    setTab(parseFeedTabParam(searchParams.get("tab")));
  }, [searchParams]);

  const handleTabChange = useCallback(
    (next: FeedTab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      const param = feedTabToSearchParam(next);
      if (param) params.set("tab", param);
      else params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <FeedBridgeProvider>
      <FeedFollowingContext.Provider
        value={{ followingHasPosts, setFollowingHasPosts }}
      >
        <FeedTabContext.Provider value={tab}>
          <div className="w-full min-w-0">
            <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md min-[500px]:static min-[500px]:border-b min-[500px]:bg-background min-[500px]:backdrop-blur-none">
              <div className="flex h-[53px] items-center px-4 min-[500px]:hidden">
                {user && profile ? (
                  <Link
                    href={`/profile/${profile.username}`}
                    aria-label="Mon profil"
                    className="shrink-0"
                  >
                    <UserAvatar
                      avatarUrl={profile.avatar_url}
                      fallbackSeed={user.id}
                      username={profile.username}
                      className="size-8 rounded-full"
                      imageClassName="rounded-full object-cover"
                      fallbackClassName="rounded-full text-xs"
                    />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    aria-label="Connexion"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground"
                  >
                    ?
                  </Link>
                )}
                <h1 className="flex-1 text-center text-xl font-bold">Accueil</h1>
                <span className="size-8 shrink-0" aria-hidden />
              </div>
              <FeedTabs value={tab} onChange={handleTabChange} />
            </div>
            <PostComposerForm user={user} profile={profile} feedTab={tab} />
            <div
              id={`feed-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`feed-tab-${tab}`}
            >
              {children}
            </div>
          </div>
        </FeedTabContext.Provider>
      </FeedFollowingContext.Provider>
    </FeedBridgeProvider>
  );
}
