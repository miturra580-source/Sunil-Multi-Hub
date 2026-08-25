-- Customer QR can be opened in a browser that already has a portal session.
-- In that case Supabase uses the authenticated role, not anon.
drop policy if exists "customers upload print files" on storage.objects;
create policy "customers upload print files"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'print-uploads'
  and exists (
    select 1
    from public.auto_print_public_shops s
    join public.auto_print_subscriptions sub on sub.user_id = s.user_id
    where s.public_slug = (storage.foldername(objects.name))[1]
      and s.active = true
      and sub.status <> 'suspended'
      and (sub.trial_ends_at > now() or sub.paid_until > now())
  )
);
