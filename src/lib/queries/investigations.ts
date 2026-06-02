import { createClient } from "@/lib/supabase/server";
import type {
  Investigation,
  InvestigationEntryWithAuthor,
  InvestigationWithAuthor,
  InvestigationVoteKind,
} from "@/lib/supabase/types";

export async function getOpenInvestigations(
  limit = 20
): Promise<Investigation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investigations")
    .select("id, title, description, author_id, status, sector_code, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Investigation[];
}

export async function getInvestigations(
  limit = 20
): Promise<InvestigationWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investigations")
    .select("*, author:profiles!author_id(*, faction:factions(*))")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as InvestigationWithAuthor[];
}

export async function getInvestigationById(
  id: number
): Promise<InvestigationWithAuthor | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investigations")
    .select("*, author:profiles!author_id(*, faction:factions(*))")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as InvestigationWithAuthor;
}

export async function getInvestigationEntries(
  investigationId: number
): Promise<InvestigationEntryWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investigation_entries")
    .select("*, author:profiles!author_id(*)")
    .eq("investigation_id", investigationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as InvestigationEntryWithAuthor[];
}

export async function getInvestigationVoteCounts(investigationId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investigation_votes")
    .select("vote")
    .eq("investigation_id", investigationId);

  const counts = { yes: 0, no: 0, uncertain: 0 };
  for (const row of data ?? []) {
    const v = row.vote as InvestigationVoteKind;
    counts[v]++;
  }
  return counts;
}

export async function getUserInvestigationVote(
  investigationId: number,
  userId: string
): Promise<InvestigationVoteKind | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("investigation_votes")
    .select("vote")
    .eq("investigation_id", investigationId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.vote as InvestigationVoteKind) ?? null;
}
