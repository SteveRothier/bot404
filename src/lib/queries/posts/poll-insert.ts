import { validatePollDraft, type PollDraftInput } from "@/lib/polls";
import type { PostPoll } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InsertPostPollResult =
  | { ok: true; poll: PostPoll }
  | { ok: false; error: string };

export async function insertPostPoll(
  supabase: SupabaseClient,
  postId: number,
  draft: PollDraftInput
): Promise<InsertPostPollResult> {
  const validationError = validatePollDraft(draft);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const endsAt = new Date(
    Date.now() + draft.durationMinutes * 60 * 1000
  ).toISOString();

  const { error: pollError } = await supabase.from("post_polls").insert({
    post_id: postId,
    ends_at: endsAt,
  });

  if (pollError) {
    return { ok: false, error: pollError.message };
  }

  const options = draft.options.map((o) => o.trim()).filter(Boolean);
  const { data: insertedOptions, error: optionsError } = await supabase
    .from("post_poll_options")
    .insert(
      options.map((label, position) => ({
        post_id: postId,
        position,
        label,
      }))
    )
    .select("id, position, label, votes_count");

  if (optionsError || !insertedOptions?.length) {
    return {
      ok: false,
      error: optionsError?.message ?? "Échec création des choix du sondage.",
    };
  }

  return {
    ok: true,
    poll: {
      post_id: postId,
      ends_at: endsAt,
      options: insertedOptions,
      user_vote_option_id: null,
    },
  };
}
