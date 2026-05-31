import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { FollowButton } from "@/components/profile/FollowButton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getFollowerCount,
  getFollowingCount,
  isFollowing,
} from "@/lib/queries/follows";
import { getCurrentUserProfile } from "@/lib/queries/feed";
import {
  getProfileByUsername,
  getPostsByUsername,
} from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import type { Personality } from "@/lib/supabase/types";

export const revalidate = 60;

type Props = {
  params: Promise<{ username: string }>;
};

async function ProfilePosts({ username }: { username: string }) {
  const posts = await getPostsByUsername(username);

  return (
    <>
      <p className="text-sm text-[#6b7280]">
        <strong className="text-foreground">{posts.length}</strong> posts
      </p>
      <FeedListLoader
        posts={posts}
        emptyMessage="Ce profil n'a pas encore posté."
      />
    </>
  );
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, currentProfile] = await Promise.all([
    getProfileByUsername(username),
    getCurrentUserProfile(),
  ]);

  if (!profile) notFound();

  const isOwnProfile = currentProfile?.id === profile.id;
  const personality = (profile.personality ?? {}) as Personality;

  const [followerCount, followingCount, initiallyFollowing] = await Promise.all([
    getFollowerCount(profile.id),
    getFollowingCount(profile.id),
    user && !isOwnProfile
      ? isFollowing(user.id, profile.id)
      : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <div className="overflow-hidden rounded-xl border border-[#24101a] bg-[#0c0e16]">
        <div className="h-24 bg-gradient-to-br from-[#3f101c] via-[#160b17] to-[#090c18]" />
        <div className="flex gap-4 p-4 pt-0">
          <Avatar className="-mt-10 size-20 rounded-lg border-4 border-[#0c0e16] after:rounded-lg">
            <AvatarImage
              src={profile.avatar_url ?? undefined}
              className="rounded-lg object-cover"
            />
            <AvatarFallback className="rounded-lg bg-[#1a0c16] text-lg text-[#fda4af]">
              {profile.username.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pt-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold">{profile.username}</h1>
                  {profile.is_npc ? (
                    <Badge className="border-0 bg-[#5b21b6] text-white">
                      NPC
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-[#e11d48] text-white">
                      Humain
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#6b7280]">
                  @{profile.username.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Link
                    href="/profile/edit"
                    className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border border-[#34121b] px-2.5 text-[0.8rem] font-medium text-[#fda4af] transition-colors hover:bg-[#11141f]"
                  >
                    Modifier le profil
                  </Link>
                ) : (
                  <FollowButton
                    profileId={profile.id}
                    initialFollowing={initiallyFollowing}
                    isOwnProfile={false}
                    isLoggedIn={!!user}
                  />
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span>
                <strong className="text-[#fb7185]">{followerCount}</strong>{" "}
                <span className="text-[#6b7280]">abonnés</span>
              </span>
              <span>
                <strong className="text-[#fb7185]">{followingCount}</strong>{" "}
                <span className="text-[#6b7280]">abonnements</span>
              </span>
              <span>
                <strong className="text-[#fb7185]">
                  {profile.popularity_score}
                </strong>{" "}
                <span className="text-[#6b7280]">popularité</span>
              </span>
            </div>

            {profile.bio && (
              <p className="mt-3 text-sm text-[#9ca3af]">{profile.bio}</p>
            )}

            {personality.personality && (
              <p className="mt-3 text-sm text-[#9ca3af]">
                {personality.personality}
                {personality.mood && ` · humeur : ${personality.mood}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <PostsSuspense count={3}>
        <ProfilePosts username={username} />
      </PostsSuspense>

      <Link href="/" className="text-sm text-[#fb7185] hover:underline">
        ← Retour au feed
      </Link>
    </div>
  );
}
