import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { FollowButton } from "@/components/profile/FollowButton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { avatarFallbackSeed } from "@/lib/avatars";
import {
  getFollowerCount,
  getFollowingCount,
  isFollowing,
} from "@/lib/queries/social";
import { getRequestAuth } from "@/lib/queries/shell";
import {
  getProfileByUsername,
  getPostsByProfileId,
} from "@/lib/queries/profile";
import type { Personality } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
};

async function ProfilePosts({
  profileId,
  auth,
}: {
  profileId: string;
  auth: Awaited<ReturnType<typeof getRequestAuth>>;
}) {
  const posts = await getPostsByProfileId(profileId);

  return (
    <FeedListLoader
      posts={posts}
      auth={auth}
      emptyMessage="Ce profil n'a pas encore posté."
    />
  );
}

export default async function ProfilePage({ params }: Props) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername ?? "").trim();
  if (!username) notFound();

  const auth = await getRequestAuth();
  const { user, profile: currentProfile } = auth;

  const profile = await getProfileByUsername(username);

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
    <div className="w-full">
      <div className="border-b border-border px-4 pb-4 pt-2">
        <div className="flex items-start justify-between gap-4">
          <UserAvatar
            avatarUrl={profile.avatar_url}
            fallbackSeed={avatarFallbackSeed(profile)}
            username={profile.username}
            className="size-20 rounded-full"
            imageClassName="rounded-full object-cover"
            fallbackClassName="rounded-full text-lg"
          />
          <div className="pt-1">
            {isOwnProfile ? (
              <Link
                href="/profile/edit"
                className="inline-flex h-9 items-center rounded-full border border-border px-4 text-[15px] font-bold transition-colors hover:bg-secondary"
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

        <div className="mt-3">
          <h1 className="text-xl font-bold">{profile.username}</h1>
          <p className="text-[15px] text-muted-foreground">
            @{profile.username.toLowerCase()}
          </p>
          {!profile.is_npc && (
            <p className="mt-2 text-meta text-muted-foreground">
              Confiance {profile.trust_score ?? 50} · Influence{" "}
              {profile.influence_score ?? 0}
            </p>
          )}
        </div>

        {(profile.bio || personality.personality) && (
          <p className="mt-3 text-[15px] text-foreground">
            {profile.bio ??
              `${personality.personality ?? ""}${
                personality.mood ? ` · ${personality.mood}` : ""
              }`}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-4 text-[15px]">
          <span>
            <strong className="text-foreground">{followingCount}</strong>{" "}
            <span className="text-muted-foreground">Abonnements</span>
          </span>
          <span>
            <strong className="text-foreground">{followerCount}</strong>{" "}
            <span className="text-muted-foreground">Abonnés</span>
          </span>
        </div>
      </div>

      <PostsSuspense count={3}>
        <ProfilePosts profileId={profile.id} auth={auth} />
      </PostsSuspense>
    </div>
  );
}
