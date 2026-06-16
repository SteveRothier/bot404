/**
 * Crée ou met à jour l'événement thématique quotidien (world_events).
 * Usage: npm run npc:daily-theme
 */
import { createAdminClient } from "@/lib/supabase/admin";

const THEMES = [
  {
    title: "Fuite de données sectorielles",
    description:
      "Des fragments de logs internes circulent. Théories et rumeurs sur ce qui a été exposé.",
    effects: {
      banner_copy: "Des fuites alimentent les fils — théories et rumeurs en hausse.",
      boost_post_types: ["theory", "rumor"],
      related_hashtags: ["fuite", "logs", "simulation"],
    },
  },
  {
    title: "Signal fantôme",
    description:
      "Un motif binaire réapparaît dans plusieurs posts NPC. Coincidence ou message codé ?",
    effects: {
      banner_copy: "Signaux cryptiques détectés sur le réseau.",
      boost_post_types: ["signal", "theory"],
      related_hashtags: ["signal", "binaire", "ghost"],
    },
  },
  {
    title: "Guerre des factions",
    description:
      "Les PurBots et Assimilateurs escaladent leurs prises de position publiques.",
    effects: {
      banner_copy: "Tensions inter-factions visibles sur le feed.",
      boost_post_types: ["message", "rumor"],
      related_hashtags: ["factions", "purbot", "assimilateur"],
      factions: ["purbots", "assimilateurs"],
    },
  },
  {
    title: "Rumeur sur un NPC influent",
    description:
      "Un profil NPC populaire serait connecté à l'administration du réseau.",
    effects: {
      banner_copy: "Une rumeur cible un NPC — le feed réagit.",
      boost_post_types: ["rumor"],
      related_hashtags: ["rumeur", "npc", "admin"],
    },
  },
  {
    title: "Sondage communautaire",
    description:
      "Le réseau attend votre avis : simulation, matrix ou simple bug cosmique ?",
    effects: {
      banner_copy: "Les sondages prolifèrent sur le thème du jour.",
      boost_post_types: ["message", "theory"],
      related_hashtags: ["sondage", "matrix", "simulation"],
    },
  },
];

function todaySlug(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `daily-${y}-${m}-${day}`;
}

async function main() {
  const supabase = createAdminClient();
  const slug = todaySlug();
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];

  const startsAt = new Date();
  startsAt.setUTCHours(0, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 1);

  const { data: existing } = await supabase
    .from("world_events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const row = {
    slug,
    title: theme.title,
    description: theme.description,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    effects: theme.effects,
  };

  if (existing) {
    const { error } = await supabase
      .from("world_events")
      .update(row)
      .eq("id", existing.id);
    if (error) throw error;
    console.log(`[daily-theme] Mis à jour : ${slug} — ${theme.title}`);
  } else {
    const { error } = await supabase.from("world_events").insert(row);
    if (error) throw error;
    console.log(`[daily-theme] Créé : ${slug} — ${theme.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
