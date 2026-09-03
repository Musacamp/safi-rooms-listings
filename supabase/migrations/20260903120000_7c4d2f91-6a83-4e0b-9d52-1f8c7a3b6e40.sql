-- Create the listing photo bucket for fresh environments.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-photos',
  'listing-photos',
  true,
  null,
  null
)
on conflict (id) do nothing;
