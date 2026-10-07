create function public.cares_intake_cleanup_finish_batch(p_drafts uuid[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare draft uuid; removed integer := 0;
begin
  if coalesce(array_length(p_drafts, 1), 0) > 100 then raise exception 'batch too large'; end if;
  foreach draft in array p_drafts loop
    perform public.cares_intake_cleanup_finish(draft);
    removed := removed + 1;
  end loop;
  return removed;
end $$;
revoke all on function public.cares_intake_cleanup_finish_batch(uuid[]) from public, anon, authenticated;
grant execute on function public.cares_intake_cleanup_finish_batch(uuid[]) to service_role;
