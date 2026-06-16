export type Personality = {
  name?: string;
  personality?: string;
  topics?: string[];
  writing_style?: string;
  mood?: string;
  example_posts?: string[];
};

export type Faction = {
  id: string;
  slug: string;
  name: string;
  color: string;
  description: string | null;
  control_percent: number;
};

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_npc: boolean;
  personality: Personality | null;
  popularity_score: number;
  faction_id: string | null;
  trust_score: number;
  influence_score: number;
  created_at: string;
  faction?: Faction | null;
};

export type PostType = "message" | "theory" | "signal" | "rumor";
export type ReactionKind = "relay" | "amplify" | "flag";

export type PostMediaType = "image" | "gif";

export type Post = {
  id: number;
  author_id: string;
  content: string;
  post_type: PostType;
  media_url: string | null;
  media_type: PostMediaType | null;
  likes_count: number;
  relay_count: number;
  amplify_count: number;
  flag_count: number;
  narrative_beat_id: number | null;
  narrative_signal_id: number | null;
  created_at: string;
};

export type PostPollOption = {
  id: number;
  label: string;
  votes_count: number;
  position: number;
};

export type PostPoll = {
  post_id: number;
  ends_at: string;
  options: PostPollOption[];
  user_vote_option_id?: number | null;
};

export type PostWithAuthor = Post & {
  author: Profile;
  comment_count?: number;
  poll?: PostPoll | null;
  /** Réponse NPC émergente publiée récemment (surbrillance fil). */
  isRecentNarrativeResponse?: boolean;
};

export type Comment = {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  narrative_beat_id: number | null;
  narrative_signal_id: number | null;
  created_at: string;
};

export type CommentWithAuthor = Comment & {
  author: Profile;
  isRecentNarrativeResponse?: boolean;
};

export type WorldEvent = {
  id: number;
  slug: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  effects: Record<string, unknown>;
  created_at: string;
};

export type TrendingHashtag = {
  tag: string;
  count: number;
};

export type TrendingNpc = {
  username: string;
  score: number;
};

export type TrendingEvent = {
  title: string;
  description: string;
  starts_in_hours?: number;
};

export type TrendingData = {
  hashtags?: TrendingHashtag[];
  top_npcs?: TrendingNpc[];
  hot_posts?: number[];
  event?: TrendingEvent;
};

export type TrendingSnapshot = {
  id: number;
  snapshot_date: string;
  data: TrendingData;
  created_at: string;
};

export type NetworkState = "stable" | "unstable" | "critical";

export type NetworkStats = {
  npcCount: number;
  humanCount: number;
  postsLast24h: number;
  humanPercent: string;
  networkState: NetworkState;
  totalFlags24h: number;
  activeEventsCount: number;
};

export type DashboardStats = {
  npcCount: number;
  humanCount: number;
  postsLast24h: number;
  signalsLast24h: number;
  rumorsLast24h: number;
  topFaction: Faction | null;
};

export type NotificationKind =
  | "mention"
  | "reaction"
  | "follow"
  | "world_event";

export type Notification = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  actor_id: string | null;
  post_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor: Pick<Profile, "id" | "username" | "avatar_url" | "is_npc"> | null;
};
