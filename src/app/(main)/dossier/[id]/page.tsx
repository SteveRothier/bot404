import Link from "next/link";
import { notFound } from "next/navigation";
import { InvestigationEntryForm } from "@/components/investigations/InvestigationEntryForm";
import { InvestigationVoteForm } from "@/components/investigations/InvestigationVoteForm";
import {
  getInvestigationById,
  getInvestigationEntries,
  getInvestigationVoteCounts,
  getUserInvestigationVote,
} from "@/lib/queries/investigations";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 30;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DossierPage({ params }: Props) {
  const { id } = await params;
  const investigationId = Number(id);
  if (!Number.isFinite(investigationId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const investigation = await getInvestigationById(investigationId);
  if (!investigation) notFound();

  const [entries, counts, currentVote] = await Promise.all([
    getInvestigationEntries(investigationId),
    getInvestigationVoteCounts(investigationId),
    user
      ? getUserInvestigationVote(investigationId, user.id)
      : Promise.resolve(null),
  ]);

  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4">
        <Link
          href="/dossiers"
          className="text-meta text-muted-foreground hover:underline"
        >
          ← Dossiers
        </Link>
        <h1 className="mt-2 text-xl font-bold">{investigation.title}</h1>
        <p className="mt-2 text-[15px] text-foreground">
          {investigation.description}
        </p>
        <p className="mt-2 text-meta text-muted-foreground">
          @{investigation.author.username}
          {investigation.sector_code
            ? ` · secteur ${investigation.sector_code}`
            : ""}
        </p>
      </div>

      <section className="px-4 py-4">
        <h2 className="mb-2 text-[15px] font-bold">Vote communautaire</h2>
        <InvestigationVoteForm
          investigationId={investigationId}
          currentVote={currentVote}
          counts={counts}
          isLoggedIn={!!user}
        />
      </section>

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">Preuves</h2>
        {entries.length === 0 ? (
          <p className="text-meta text-muted-foreground">
            Aucune preuve soumise.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border px-3 py-3"
              >
                <p className="text-meta text-muted-foreground">
                  @{entry.author.username}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[15px]">
                  {entry.content}
                </p>
                {entry.post_id && (
                  <Link
                    href={`/post/${entry.post_id}`}
                    className="mt-2 inline-block text-sm text-accent hover:underline"
                  >
                    Voir le post source →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        <InvestigationEntryForm
          investigationId={investigationId}
          isLoggedIn={!!user}
        />
      </section>
    </div>
  );
}
