import { createAdminClient } from "@/lib/supabase/admin";

const COMMENT_LIMIT = 8;

export async function buildRichThreadSnippet(
  postId: number | null
): Promise<string> {
  if (!postId) return "";

  const supabase = createAdminClient();
  const { data: root } = await supabase
    .from("posts")
    .select("content, author:profiles!author_id(username)")
    .eq("id", postId)
    .maybeSingle();

  const parts: string[] = [];

  if (root) {
    const author = root.author as { username?: string } | null;
    parts.push(
      `Post racine (@${author?.username ?? "?"}): « ${root.content} »`
    );
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("content, author:profiles!author_id(username)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(COMMENT_LIMIT);

  if (comments?.length) {
    const lines = comments
      .reverse()
      .map((c) => {
        const author = c.author as { username?: string } | null;
        return `@${author?.username ?? "?"}: ${c.content}`;
      })
      .join("\n");
    parts.push(`Commentaires récents :\n${lines}`);
  }

  return parts.join("\n\n");
}
