-- Profile photos are stored in the public "media" bucket at <user_id>/avatar.jpg,
-- so the account's user_metadata only carries a short URL. Keeping the image
-- itself in user_metadata put it inside every session token, which grew the
-- Authorization header until the Storage gateway answered 400 Bad Request.
--
-- Each account manages only its own folder; the bucket stays publicly readable.
create policy media_avatar_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy media_avatar_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy media_avatar_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (auth.uid())::text);
