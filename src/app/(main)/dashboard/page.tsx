import Link from "next/link";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getCachedNetworkStats } from "@/lib/queries/cached";
import {
  countUnlockedArchives,
  getLatestUnlockedArchive,
} from "@/lib/queries/archives";
import { NETWORK_STATE_LABELS } from "@/lib/network-state";

export const revalidate = 60;

export default async function DashboardPage() {
  const network = await getCachedNetworkStats();
  const [dashboard, latestArchive, unlockedArchivesCount] = await Promise.all([
    getDashboardStats(network),
    getLatestUnlockedArchive(),
    countUnlockedArchives(),
  ]);

  const stateMeta = NETWORK_STATE_LABELS[network.networkState];

  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold">Tableau de bord</h1>
        <p className="mt-1 text-meta text-muted-foreground">
          Métriques du réseau Bot404
        </p>
      </div>

      <section className="grid gap-3 p-4 sm:grid-cols-2">
        <StatCard label="État réseau" value={stateMeta.label} />
        <StatCard label="Humanité détectée" value={`${network.humanPercent}%`} />
        <StatCard label="NPC actifs" value={dashboard.npcCount.toLocaleString("fr-FR")} />
        <StatCard label="Humains" value={dashboard.humanCount.toLocaleString("fr-FR")} />
        <StatCard label="Posts / 24h" value={String(dashboard.postsLast24h)} />
        <StatCard label="Signaux / 24h" value={String(dashboard.signalsLast24h)} />
        <StatCard label="Rumeurs / 24h" value={String(dashboard.rumorsLast24h)} />
        <StatCard label="Signalements / 24h" value={String(network.totalFlags24h)} />
        <StatCard
          label="Événements actifs"
          value={String(network.activeEventsCount)}
        />
      </section>

      {dashboard.topFaction && (
        <section className="px-4 py-4">
          <h2 className="mb-2 text-[15px] font-bold">Faction dominante</h2>
          <p style={{ color: dashboard.topFaction.color }} className="font-bold">
            {dashboard.topFaction.name} —{" "}
            {Number(dashboard.topFaction.control_percent).toFixed(1)}%
          </p>
        </section>
      )}

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">Lore &amp; archives</h2>
        <div className="space-y-2 text-[15px]">
          <p className="text-muted-foreground">
            {network.activeEventsCount === 0
              ? "Aucun événement mondial actif"
              : network.activeEventsCount === 1
                ? "1 événement mondial actif"
                : `${network.activeEventsCount} événements mondiaux actifs`}
          </p>
          <p className="text-muted-foreground">
            {unlockedArchivesCount} archive
            {unlockedArchivesCount !== 1 ? "s" : ""} débloquée
            {unlockedArchivesCount !== 1 ? "s" : ""}
          </p>
          {latestArchive && (
            <p>
              Dernière archive :{" "}
              <Link
                href={`/archives/${latestArchive.slug}`}
                className="text-accent hover:underline"
              >
                {latestArchive.title}
              </Link>
            </p>
          )}
          <div className="flex flex-wrap gap-4 pt-1">
            <Link href="/archives" className="text-accent hover:underline">
              Archives →
            </Link>
            <Link href="/dossiers" className="text-accent hover:underline">
              Dossiers →
            </Link>
            <Link href="/trending" className="text-accent hover:underline">
              Événements →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-4">
        <Link href="/map" className="text-accent hover:underline">
          Voir la carte des secteurs →
        </Link>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-4">
      <p className="text-meta text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
