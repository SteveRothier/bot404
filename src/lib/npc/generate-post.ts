import { processPostFactionEffects } from "@/lib/factions/simulation";
import {
  buildNpcLorePromptBlock,
  getNpcLoreContext,
} from "@/lib/lore/lore-context";
import { getWorldEventEffects } from "@/lib/lore/world-event-effects";
import { checkOllamaStatus } from "@/lib/ollama";
import { resolveNpcPostMedia, shouldAttachMediaToNpcPost } from "@/lib/npc/media";
import { maybeAttachNpcPoll, shouldNpcAttachPoll } from "@/lib/npc/poll-create";
import { ollamaChat, ollamaProfileForPostType } from "@/lib/npc/ollama";
import {
  buildNpcPostPrompt,
  npcPostUserMessage,
} from "@/lib/npc/prompt";
import { pickRotatingNpc, factionNameForNpc } from "@/lib/npc/select-npc";
import {
  buildNpcHistoryBlock,
  fetchRecentNpcPostContents,
} from "@/lib/npc/npc-history";
import { validateNpcPostContent } from "@/lib/npc/validate-content";
import { pickRandomNpcPostType } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType } from "@/lib/supabase/types";
export type GenerateNpcPostResult =
  | { ok: true; author: string; postId: number; postType: string }
  | { ok: false; error: string };

export async function generateNpcPost(): Promise<GenerateNpcPostResult> {
  const ollama = await checkOllamaStatus();
  if (!ollama.online) {
    return {
      ok: false,
      error: "Ollama est hors ligne. Lancez ollama serve puis réessayez.",
    };
  }

  const supabase = createAdminClient();
  const npc = await pickRotatingNpc();
  if (!npc) {
    return { ok: false, error: "Aucun NPC trouvé." };
  }

  const loreContext = await getNpcLoreContext();
  const loreBlock = buildNpcLorePromptBlock(loreContext);
  const historyBlock = await buildNpcHistoryBlock(npc.id);
  const recentPosts = await fetchRecentNpcPostContents(npc.id);

  const eventEffects = loreContext.activeEvent
    ? getWorldEventEffects(loreContext.activeEvent)
    : null;

  let postType = pickRandomNpcPostType();
  if (
    eventEffects &&
    eventEffects.boost_post_types.length > 0 &&
    Math.random() < 0.55
  ) {
    postType =
      eventEffects.boost_post_types[
        Math.floor(Math.random() * eventEffects.boost_post_types.length)
      ];
  }

  const raw = await ollamaChat(
    buildNpcPostPrompt(npc, postType, loreBlock + historyBlock, factionNameForNpc(npc)),
    npcPostUserMessage(postType),
    500,
    ollamaProfileForPostType(postType)
  );

  const content = raw
    ? validateNpcPostContent(raw, postType, "", recentPosts)
    : null;

  if (!content) {
    return {
      ok: false,
      error: "Échec de la génération (Ollama ou contenu filtré).",
    };
  }

  const usePoll = shouldNpcAttachPoll(postType as PostType, false, "ambient");

  const media =
    !usePoll && shouldAttachMediaToNpcPost(npc, postType)
      ? await resolveNpcPostMedia(npc, content, postType)
      : null;

  const { data: post, error: insertError } = await supabase
    .from("posts")
    .insert({
      author_id: npc.id,
      content,
      post_type: postType,
      likes_count: Math.floor(Math.random() * 500) + 50,
      media_url: media?.media_url ?? null,
      media_type: media?.media_type ?? null,
    })
    .select("id")
    .single();

  if (insertError || !post) {
    return {
      ok: false,
      error: insertError?.message ?? "Impossible d'enregistrer le post.",
    };
  }

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  await processPostFactionEffects(supabase, post.id);

  if (usePoll) {
    await maybeAttachNpcPoll({
      supabase,
      postId: post.id,
      npc,
      content,
      postType: postType as PostType,
      hasMedia: false,
      context: "ambient",
      forceAttach: true,
    });
  }

  return {
    ok: true,
    author: npc.username,
    postId: post.id,
    postType,
  };
}
