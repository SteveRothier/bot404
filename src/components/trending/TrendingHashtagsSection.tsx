import { HashtagList } from "@/components/widgets/HashtagList";
import { getCachedPopularHashtags } from "@/lib/queries/shell";

export async function TrendingHashtagsSection() {
  const hashtags = await getCachedPopularHashtags(10);

  return (
    <section className="px-4 py-4">
      <h2 className="mb-3 text-[15px] font-bold">Hashtags populaires</h2>
      <HashtagList
        hashtags={hashtags}
        emptyMessage="Aucun hashtag détecté pour l'instant."
      />
    </section>
  );
}
