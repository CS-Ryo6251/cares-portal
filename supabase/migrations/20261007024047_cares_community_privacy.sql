-- Apply AFTER the matching frontend deployment. See docs/rollout.md.
begin;
-- New writes pass through the server: do not allow bypassing validation via the Data API.
revoke all on public.cares_vacancy_reports, public.cares_professional_notes from public, anon, authenticated;
drop policy if exists cares_vacancy_public_insert on public.cares_vacancy_reports;
drop policy if exists cares_notes_public_insert on public.cares_professional_notes;
-- Do not expose identity/IP metadata in direct public reads.
revoke select on public.cares_vacancy_reports, public.cares_professional_notes from public, anon, authenticated;
grant select(id,listing_id,vacancy_type,comment,reported_at,is_verified,information_source,confirmed_on,valid_until) on public.cares_vacancy_reports to anon, authenticated;
grant select(id,listing_id,reporter_type,content,created_at) on public.cares_professional_notes to anon, authenticated;
-- The old private stars remain available to their author only.
revoke all on public.cares_user_ratings from public, anon, authenticated;
grant select on public.cares_user_ratings to authenticated;
drop policy if exists cares_user_ratings_public_read on public.cares_user_ratings;
create policy cares_user_ratings_own_read on public.cares_user_ratings for select to authenticated using ((select auth.uid()) = user_id);
commit;
