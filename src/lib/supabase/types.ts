export type Personality = {
  name?: string;
  personality?: string;
  topics?: string[];
  writing_style?: string;
  mood?: string;
  example_posts?: string[];
};

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_npc: boolean;
  personality: Personality | null;
  popularity_score: number;
  trust_score: number;
  influence_score: number;
  welcome_focus_until?: string | null;
  created_at: string;
};

export type PostType = "message" | "theory" | "signal" | "rumor";
export type ReactionKind = "relay";

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
  amplify_count?: number;
  flag_count?: number;
  view_count: number;
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
  relay_count?: number;
  narrative_beat_id: number | null;
  narrative_signal_id: number | null;
  created_at: string;
};

export type CommentWithAuthor = Comment & {
  author: Profile;
  isRecentNarrativeResponse?: boolean;
};

export type TrendingHashtag = {
  tag: string;
  count: number;
};

export type NetworkState = "stable" | "unstable" | "critical";

export type NetworkStats = {
  npcCount: number;
  humanCount: number;
  postsLast24h: number;
  humanPercent: string;
  networkState: NetworkState;
};

export type NotificationKind =
  | "mention"
  | "reaction"
  | "follow"
  | "comment_reaction"
  | "comment_reply";

export type Notification = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  actor_id: string | null;
  post_id: number | null;
  comment_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationWithActor = Notification & {
  actor: Pick<Profile, "id" | "username" | "avatar_url" | "is_npc"> | null;
};
