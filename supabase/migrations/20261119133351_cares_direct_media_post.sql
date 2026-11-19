-- Unknown availability must not prevent a photo/video post or invent a vacancy.
alter table public.facility_portal_posts drop constraint facility_portal_posts_acceptance_status_at_post_check;
alter table public.facility_portal_posts add constraint facility_portal_posts_acceptance_status_at_post_check
  check (acceptance_status_at_post in ('accepting', 'conditional', 'full', 'paused', 'unknown'));

-- Called only by the server after facility authorization and signed upload validation.
-- Post and media become visible together; retries with the same ticket return the same post.
create or replace function public.create_cares_media_post(p_post jsonb, p_media jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  saved public.facility_portal_posts;
  post_id uuid := (p_post->>'id')::uuid;
begin
  if jsonb_typeof(p_media) is distinct from 'array' or jsonb_array_length(p_media) not between 1 and 5 then
    raise exception 'Select 1 to 5 media files';
  end if;
  insert into public.facility_portal_posts
    (id, facility_id, profile_id, user_id, content, title, post_type, category, link_url, acceptance_status_at_post, status)
  values
    (post_id, (p_post->>'facility_id')::uuid, (p_post->>'profile_id')::uuid, (p_post->>'user_id')::uuid,
     p_post->>'content', p_post->>'title', p_post->>'post_type', p_post->>'category', p_post->>'link_url',
     p_post->>'acceptance_status_at_post', p_post->>'status')
  on conflict (id) do nothing
  returning * into saved;
  if saved.id is not null then
    insert into public.facility_portal_post_media (post_id, media_url, media_type, sort_order)
      select post_id, item->>'media_url', item->>'media_type', (ordinality - 1)::integer
      from jsonb_array_elements(p_media) with ordinality as media(item, ordinality);
  else
    select * into saved from public.facility_portal_posts
      where id = post_id and user_id = (p_post->>'user_id')::uuid and facility_id = (p_post->>'facility_id')::uuid;
    if saved.id is null then raise exception 'Post owner mismatch'; end if;
  end if;
  return to_jsonb(saved) || jsonb_build_object('facility_portal_post_media',
    (select coalesce(jsonb_agg(to_jsonb(m) order by m.sort_order), '[]'::jsonb)
     from public.facility_portal_post_media m where m.post_id = saved.id));
end;
$$;
revoke all on function public.create_cares_media_post(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_cares_media_post(jsonb, jsonb) to service_role;
