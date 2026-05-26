"use client";

import { useState } from "react";
import { PostComposerForm } from "@/components/feed/PostComposerForm";
import type { Profile } from "@/lib/supabase/types";
import { FeedTabs, type FeedTab } from "@/components/feed/FeedTabs";
import { FeedList } from "@/components/feed/FeedList";
import type { PostWithAuthor } from "@/lib/supabase/types";

type Props = {
  recentPosts: PostWithAuthor[];
  popularPosts: PostWithAuthor[];
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  likedPostIds: number[];
};

export function FeedSection({
  recentPosts,
  popularPosts,
  user,
  profile,
  likedPostIds,
}: Props) {
  const isLoggedIn = !!user;
  const [tab, setTab] = useState<FeedTab>("for-you");

  const posts =
    tab === "popular"
      ? popularPosts
      : tab === "recent"
        ? recentPosts
        : recentPosts;

  return (
    <div className="space-y-4">
      <PostComposerForm user={user} profile={profile} />
      <FeedTabs value={tab} onChange={setTab} />
      <FeedList
        posts={posts}
        likedPostIds={likedPostIds}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}
