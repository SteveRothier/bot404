import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveVisitTracker } from "@/components/lore/ArchiveVisitTracker";
import { getArchiveBySlug } from "@/lib/queries/archives";
import { formatRelativeTimeShort } from "@/lib/format";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ArchiveDetailPage({ params }: Props) {
  const { slug } = await params;
  const archive = await getArchiveBySlug(slug);
  if (!archive) notFound();

  const unlockedAt = archive.unlocked_at
    ? formatRelativeTimeShort(archive.unlocked_at, Date.now())
    : null;
  const tags = archive.related_tags ?? [];

  return (
    <article className="px-4 py-4">
      <ArchiveVisitTracker slug={slug} />
      <Link
        href="/archives"
        className="text-meta text-muted-foreground hover:underline"
      >
        ← Archives
      </Link>
      <p className="mt-3 text-meta font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
        Archive débloquée
      </p>
      <h1 className="mt-1 text-xl font-bold">{archive.title}</h1>
      {unlockedAt && (
        <p className="mt-1 text-meta text-muted-foreground">
          Débloquée {unlockedAt}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4">
        <p className="whitespace-pre-wrap font-mono text-[15px] leading-relaxed text-foreground">
          {archive.content}
        </p>
      </div>

      {tags.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[15px] font-bold">Pistes liées</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="rounded-full border border-border px-3 py-1 text-sm text-accent hover:bg-secondary"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/" className="text-accent hover:underline">
          Retour au feed
        </Link>
        <Link href="/dossiers" className="text-accent hover:underline">
          Ouvrir les dossiers
        </Link>
        <Link href="/trending" className="text-muted-foreground hover:underline">
          Événements mondiaux
        </Link>
      </div>
    </article>
  );
}
