import type { SupabaseClient } from "@supabase/supabase-js";

export async function toggleMembership(
  supabase: SupabaseClient,
  table: string,
  match: Record<string, string | number>,
  insert: Record<string, string | number>
): Promise<{ success: true; active: boolean } | { error: string }> {
  let selectQuery = supabase.from(table).select(Object.keys(match)[0] ?? "id");
  for (const [key, value] of Object.entries(match)) {
    selectQuery = selectQuery.eq(key, value);
  }

  const { data: existing } = await selectQuery.maybeSingle();

  if (existing) {
    let deleteQuery = supabase.from(table).delete();
    for (const [key, value] of Object.entries(match)) {
      deleteQuery = deleteQuery.eq(key, value);
    }
    const { error } = await deleteQuery;
    if (error) return { error: error.message };
    return { success: true, active: false };
  }

  const { error } = await supabase.from(table).insert(insert);
  if (error) return { error: error.message };
  return { success: true, active: true };
}
