-- Complète la conversion Dicebear SVG → PNG pour les profils restants.

update public.profiles
set avatar_url = replace(avatar_url, '/svg?', '/png?')
where avatar_url like '%api.dicebear.com%'
  and avatar_url like '%/svg%'
  and avatar_url not like '%/png%';
