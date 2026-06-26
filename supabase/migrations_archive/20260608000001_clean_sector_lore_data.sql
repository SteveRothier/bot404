-- Données seedées avant la suppression des secteurs : descriptions obsolètes en prod.

update world_events
set effects = effects - 'sectors'
where effects ? 'sectors';
