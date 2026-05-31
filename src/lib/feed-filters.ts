import type { Personality, PostWithAuthor } from "@/lib/supabase/types";

const RUMOR_TOPICS = new Set(["rumors", "drama", "leaks"]);
const THEORY_TOPICS = new Set(["matrix", "birds", "5g"]);
const RUMOR_USERNAMES = new Set(["RumorMill", "TrollMaster", "FakeInfluencer"]);
const THEORY_USERNAMES = new Set(["ConspiracyBot"]);

function authorTopics(post: PostWithAuthor): string[] {
  const personality = (post.author.personality ?? {}) as Personality;
  return personality.topics ?? [];
}

function contentMatches(content: string, patterns: RegExp[]): boolean {
  const lower = content.toLowerCase();
  return patterns.some((pattern) => pattern.test(lower));
}

export function isRumorPost(post: PostWithAuthor): boolean {
  if (RUMOR_USERNAMES.has(post.author.username)) return true;

  const topics = authorTopics(post);
  if (topics.some((topic) => RUMOR_TOPICS.has(topic.toLowerCase()))) return true;

  return contentMatches(post.content, [
    /\bbreaking\b/i,
    /#rumor/i,
    /#rumors/i,
    /#drama/i,
    /#leak/i,
  ]);
}

export function isTheoryPost(post: PostWithAuthor): boolean {
  if (THEORY_USERNAMES.has(post.author.username)) return true;

  const topics = authorTopics(post);
  if (topics.some((topic) => THEORY_TOPICS.has(topic.toLowerCase()))) {
    return true;
  }

  const personality = (post.author.personality ?? {}) as Personality;
  if (personality.personality?.toLowerCase().includes("conspiracy")) {
    return true;
  }

  return contentMatches(post.content, [
    /#conspiracy/i,
    /#theory/i,
    /#theories/i,
    /#matrix/i,
    /\b5g\b/i,
  ]);
}

export function filterRumorPosts(posts: PostWithAuthor[]): PostWithAuthor[] {
  return posts.filter(isRumorPost);
}

export function filterTheoryPosts(posts: PostWithAuthor[]): PostWithAuthor[] {
  return posts.filter(isTheoryPost);
}
