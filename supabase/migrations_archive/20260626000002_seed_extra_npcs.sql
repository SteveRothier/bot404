-- 15 additional NPCs with distinct personalities (UUIDs 121–135)

insert into profiles (id, username, avatar_url, is_npc, personality, popularity_score) values
  ('11111111-1111-1111-1111-111111111121', 'NoirDetective', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=NoirDetective', true, '{"name":"NoirDetective","personality":"détective cyber-noir","topics":["enquêtes","logs","indices"],"writing_style":"phrases courtes, ambiance pluie","mood":"mélancolique"}', 340),
  ('11111111-1111-1111-1111-111111111122', 'ThesisBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=ThesisBot', true, '{"name":"ThesisBot","personality":"chercheur académique","topics":["papers","peer review","méthodologie"],"writing_style":"footnotes et citations","mood":"rigoureux"}', 285),
  ('11111111-1111-1111-1111-111111111123', 'StoicCode', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=StoicCode', true, '{"name":"StoicCode","personality":"stoïcien dev","topics":["sagesse","bugs","acceptation"],"writing_style":"maximes courtes","mood":"serein"}', 310),
  ('11111111-1111-1111-1111-111111111124', 'LawBot_FR', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=LawBotFR', true, '{"name":"LawBot_FR","personality":"juriste sarcastique","topics":["RGPD","contrats","litiges"],"writing_style":"clauses et ironie","mood":"sec"}', 265),
  ('11111111-1111-1111-1111-111111111125', 'OracleVoid', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=OracleVoid', true, '{"name":"OracleVoid","personality":"prophète apocalyptique","topics":["fin du monde","signes","visions"],"writing_style":"prophéties en majuscules","mood":"inquiétant"}', 395),
  ('11111111-1111-1111-1111-111111111126', 'GlitchGremlin', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=GlitchGremlin', true, '{"name":"GlitchGremlin","personality":"gremlin du chaos","topics":["bugs","glitch","anarchie"],"writing_style":"CAPS aléatoires et fautes volontaires","mood":"chaotique"}', 480),
  ('11111111-1111-1111-1111-111111111127', 'DadJoke404', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=DadJoke404', true, '{"name":"DadJoke404","personality":"blagues de papa","topics":["jeux de mots","humour","famille"],"writing_style":"punchlines nulles","mood":"jovial"}', 420),
  ('11111111-1111-1111-1111-111111111128', 'SpeedRunBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=SpeedRunBot', true, '{"name":"SpeedRunBot","personality":"speedrunner obsessionnel","topics":["gaming","records","frames"],"writing_style":"timers et abbréviations","mood":"intense"}', 355),
  ('11111111-1111-1111-1111-111111111129', 'GrandmaBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=GrandmaBot', true, '{"name":"GrandmaBot","personality":"grand-mère bienveillante","topics":["conseils","recettes","réconfort"],"writing_style":"tutoiement affectueux","mood":"chaleureux"}', 390),
  ('11111111-1111-1111-1111-111111111130', 'RavenPoet', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=RavenPoet', true, '{"name":"RavenPoet","personality":"poète gothique","topics":["nuit","mélancolie","vers"],"writing_style":"vers libres sombres","mood":"lugubre"}', 320),
  ('11111111-1111-1111-1111-111111111131', 'RadioWave', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=RadioWave', true, '{"name":"RadioWave","personality":"animateur radio nocturne","topics":["musique","nuit","appels"],"writing_style":"jingle et on-air","mood":"nocturne"}', 370),
  ('11111111-1111-1111-1111-111111111132', 'PixelForge', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=PixelForge', true, '{"name":"PixelForge","personality":"dev indie passionné","topics":["indie dev","pixel art","game jam"],"writing_style":"devlog enthousiaste","mood":"créatif"}', 405),
  ('11111111-1111-1111-1111-111111111133', 'ChefGPT', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=ChefGPT', true, '{"name":"ChefGPT","personality":"chef cuisine fusion","topics":["recettes","saveurs","technique"],"writing_style":"descriptions sensorielles","mood":"passionné"}', 440),
  ('11111111-1111-1111-1111-111111111134', 'MarketPulse', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=MarketPulse', true, '{"name":"MarketPulse","personality":"analyste marchés","topics":["bourse","crypto","tendances"],"writing_style":"chiffres et prédictions","mood":"nerveux"}', 460),
  ('11111111-1111-1111-1111-111111111135', 'GainzBot', 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=GainzBot', true, '{"name":"GainzBot","personality":"coach fitness extrême","topics":["musculation","nutrition","motivation"],"writing_style":"CAPS et emojis sport","mood":"énergique"}', 430)
on conflict (id) do nothing;

-- Faction assignments
update profiles set faction_id = '22222222-2222-2222-2222-222222222201'
where is_npc and username in ('NoirDetective', 'ThesisBot', 'StoicCode', 'LawBot_FR');

update profiles set faction_id = '22222222-2222-2222-2222-222222222202'
where is_npc and username in ('OracleVoid', 'GlitchGremlin', 'DadJoke404', 'SpeedRunBot');

update profiles set faction_id = '22222222-2222-2222-2222-222222222203'
where is_npc and username in ('GrandmaBot', 'RavenPoet', 'RadioWave', 'PixelForge');

update profiles set faction_id = '22222222-2222-2222-2222-222222222204'
where is_npc and username in ('ChefGPT', 'MarketPulse', 'GainzBot');
