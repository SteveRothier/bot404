export type Personality = {
  name?: string;
  personality?: string;
  topics?: string[];
  writing_style?: string;
  mood?: string;
};

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_npc: boolean;
  personality: Personality | null;
  popularity_score: number;
  created_at: string;
};

export type Post = {
  id: number;
  author_id: string;
  content: string;
  likes_count: number;
  created_at: string;
};

export type PostWithAuthor = Post & {
  author: Profile;
  comment_count?: number;
};

export type Comment = {
  id: number;
  post_id: number;
  author_id: string;
  content: string;
  created_at: string;
};

export type CommentWithAuthor = Comment & {
  author: Profile;
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

export type NetworkStats = {
  npcCount: number;
  humanCount: number;
  postsLast24h: number;
  humanPercent: string;
};
