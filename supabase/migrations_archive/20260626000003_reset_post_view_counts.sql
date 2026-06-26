-- Remise à zéro des vues selon la sémantique humain / NPC

-- Posts humains : vues réelles uniquement (repartent de 0)
update posts p
set view_count = 0
from profiles pr
where p.author_id = pr.id
  and pr.is_npc = false;

-- Posts NPC : vues d'ambiance recalculées pour tous
update posts p
set view_count = greatest(p.relay_count + p.amplify_count, 1) * (10 + floor(random() * 90)::int)
from profiles pr
where p.author_id = pr.id
  and pr.is_npc = true;
