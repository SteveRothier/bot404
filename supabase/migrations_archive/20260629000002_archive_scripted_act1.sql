-- Désactive l'arc scripté Acte 1 (le tick n'exécute plus les beats scriptés)

update narrative_arcs
set status = 'paused', ends_at = coalesce(ends_at, now())
where slug = 'chasse-humains-acte-1' and status = 'active';

-- Active l'arc émergent si encore en pause
update narrative_arcs
set status = 'active', starts_at = coalesce(starts_at, now())
where slug = 'reseau-reactif' and status = 'paused';
