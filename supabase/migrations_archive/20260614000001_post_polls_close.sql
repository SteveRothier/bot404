-- Permettre à l'auteur du post de clôturer son sondage (ends_at → now)

create policy "post_polls_update_author"
  on post_polls for update
  to authenticated
  using (
    exists (
      select 1 from posts
      where id = post_id and author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from posts
      where id = post_id and author_id = auth.uid()
    )
  );
