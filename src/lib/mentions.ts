export const MENTION_REGEX = /@([\w]+)/g;
export const MENTION_TOKEN_REGEX = /^@([\w]+)$/i;

export function mentionProfileHref(username: string): string {
  return `/profile/${encodeURIComponent(username)}`;
}

export function extractMentionUsernames(content: string): string[] {
  const usernames = new Set<string>();
  for (const match of content.matchAll(MENTION_REGEX)) {
    if (match[1]) usernames.add(match[1].toLowerCase());
  }
  return [...usernames];
}

export function withReplyMention(content: string, username: string): string {
  const mention = `@${username.toLowerCase()}`;
  if (content.toLowerCase().includes(mention)) return content.slice(0, 300);
  return `${mention} ${content}`.trim().slice(0, 300);
}
