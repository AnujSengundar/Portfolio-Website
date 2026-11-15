-- Run once in the Supabase SQL editor. All access is through authenticated Vercel functions.
create table public.blog_topics (
  id uuid primary key default gen_random_uuid(), title text not null, category text not null,
  format text not null, notes text not null default '', sources jsonb not null default '[]',
  status text not null default 'queued', dedupe_key text unique, created_at timestamptz not null default now()
);
create table public.blog_drafts (
  id uuid primary key default gen_random_uuid(), topic_id uuid unique references public.blog_topics(id),
  content jsonb not null, revision int not null default 1, emailed_revision int,
  email_status text not null default 'not_sent', email_token uuid, email_started_at timestamptz,
  email_error text, published_revision int, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.blog_assets (
  id uuid primary key, path text not null unique, mime text not null,
  credit jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.blog_publications (
  draft_id uuid primary key references public.blog_drafts(id), slug text not null unique,
  content jsonb not null, revision int not null, published_at timestamptz not null default now()
);
create table public.blog_jobs (
  id uuid primary key default gen_random_uuid(), topic_id uuid references public.blog_topics(id),
  stage text not null default 'researching', error text, research jsonb,
  started_at timestamptz not null default now(), finished_at timestamptz
);
create table public.blog_settings (
  id boolean primary key default true check(id), schedule_enabled boolean not null default false,
  next_run_on date, trial_completed boolean not null default false,
  active_job uuid references public.blog_jobs(id), lock_until timestamptz
);
insert into public.blog_settings(id) values(true);

alter table public.blog_topics enable row level security;
alter table public.blog_drafts enable row level security;
alter table public.blog_assets enable row level security;
alter table public.blog_publications enable row level security;
alter table public.blog_jobs enable row level security;
alter table public.blog_settings enable row level security;
revoke all on public.blog_topics, public.blog_drafts, public.blog_assets, public.blog_publications, public.blog_jobs, public.blog_settings from anon, authenticated;
grant all on public.blog_topics, public.blog_drafts, public.blog_assets, public.blog_publications, public.blog_jobs, public.blog_settings to service_role;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('blog-images','blog-images',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create function public.blog_start_generation(p_topic uuid default null, p_scheduled boolean default false)
returns jsonb language plpgsql set search_path = public as $$
declare s blog_settings; t blog_topics; j blog_jobs; today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select * into s from blog_settings where id=true for update;
  if p_scheduled and (not s.schedule_enabled or s.next_run_on > today or s.next_run_on is null) then return null; end if;
  if s.lock_until > now() then raise exception 'A generation job is already in progress.'; end if;
  if s.active_job is not null then
    update blog_jobs set stage='interrupted', error='The previous run timed out. Retry this topic.', finished_at=now() where id=s.active_job and finished_at is null;
    update blog_topics set status='error' where id=(select topic_id from blog_jobs where id=s.active_job) and status='generating';
  end if;
  if p_topic is null then
    select * into t from blog_topics where status='queued' order by created_at limit 1 for update;
  else
    select * into t from blog_topics where id=p_topic and status in ('queued','error') for update;
  end if;
  if t.id is null then
    update blog_settings set active_job=null,lock_until=null,
      next_run_on=case when p_scheduled then today+2 else next_run_on end where id=true;
    return null;
  end if;
  if exists(select 1 from blog_drafts where topic_id=t.id) then raise exception 'A draft already exists for this topic.'; end if;
  insert into blog_jobs(topic_id) values(t.id) returning * into j;
  update blog_topics set status='generating' where id=t.id;
  update blog_settings set active_job=j.id,lock_until=now()+interval '6 minutes',
    next_run_on=case when p_scheduled then today+2 else next_run_on end where id=true;
  return jsonb_build_object('job',to_jsonb(j),'topic',to_jsonb(t));
end $$;

create function public.blog_finish_generation(p_job uuid, p_content jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare s blog_settings; d blog_drafts; t uuid;
begin
  select * into s from blog_settings where id=true for update;
  if s.active_job is distinct from p_job or s.lock_until < now() then raise exception 'Generation is no longer active.'; end if;
  select topic_id into t from blog_jobs where id=p_job;
  insert into blog_drafts(topic_id,content) values(t,p_content) returning * into d;
  update blog_jobs set stage='complete',finished_at=now() where id=p_job;
  update blog_topics set status='drafted' where id=t;
  update blog_settings set active_job=null,lock_until=null where id=true;
  return to_jsonb(d);
end $$;

create function public.blog_fail_generation(p_job uuid, p_error text)
returns void language plpgsql set search_path = public as $$
begin
  perform 1 from blog_settings where id=true for update;
  if (select active_job from blog_settings where id=true) is distinct from p_job then return; end if;
  update blog_jobs set stage='failed',error=p_error,finished_at=now() where id=p_job;
  update blog_topics set status='error' where id=(select topic_id from blog_jobs where id=p_job);
  update blog_settings set active_job=null,lock_until=null where id=true;
end $$;

create function public.blog_save_draft(p_id uuid, p_revision int, p_content jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare d blog_drafts;
begin
  select * into d from blog_drafts where id=p_id for update;
  if d.id is null then raise exception 'Draft not found.'; end if;
  if d.revision is distinct from p_revision then raise exception 'This revision is outdated. Reload before saving.'; end if;
  update blog_drafts set content=p_content,revision=revision+1,email_status='not_sent',
    emailed_revision=null,email_token=null,email_error=null,updated_at=now() where id=p_id returning * into d;
  return to_jsonb(d);
end $$;

create function public.blog_begin_email(p_id uuid, p_revision int)
returns jsonb language plpgsql set search_path = public as $$
declare d blog_drafts;
begin
  select * into d from blog_drafts where id=p_id for update;
  if d.id is null then raise exception 'Draft not found.'; end if;
  if d.revision is distinct from p_revision then raise exception 'This revision is outdated.'; end if;
  if d.email_status='sent' and d.emailed_revision=p_revision then raise exception 'This revision was already emailed.'; end if;
  if d.email_status='sending' and d.email_started_at>now()-interval '6 minutes' then raise exception 'Email delivery is in progress.'; end if;
  update blog_drafts set email_status='sending',email_token=gen_random_uuid(),email_started_at=now(),email_error=null
    where id=p_id returning * into d;
  return to_jsonb(d);
end $$;

create function public.blog_complete_email(p_id uuid,p_revision int,p_token uuid,p_error text default null)
returns boolean language plpgsql set search_path = public as $$
declare d blog_drafts;
begin
  select * into d from blog_drafts where id=p_id for update;
  if d.revision is distinct from p_revision or d.email_token is distinct from p_token then return false; end if;
  update blog_drafts set email_status=case when p_error is null then 'sent' else 'failed' end,
    email_error=p_error,emailed_revision=case when p_error is null then p_revision else null end where id=p_id;
  if p_error is null and exists(select 1 from blog_jobs where topic_id=d.topic_id and stage='complete') then
    update blog_settings set trial_completed=true where id=true;
  end if;
  return true;
end $$;

create function public.blog_publish(p_id uuid,p_revision int,p_slug text)
returns jsonb language plpgsql set search_path = public as $$
declare d blog_drafts; p blog_publications;
begin
  select * into d from blog_drafts where id=p_id for update;
  if d.id is null then raise exception 'Draft not found.'; end if;
  if d.revision is distinct from p_revision or d.emailed_revision is distinct from p_revision or d.email_status<>'sent' then
    raise exception 'The latest revision must be emailed before approval.';
  end if;
  insert into blog_publications(draft_id,slug,content,revision) values(d.id,p_slug,d.content,d.revision)
    on conflict(draft_id) do update set content=excluded.content,revision=excluded.revision returning * into p;
  update blog_drafts set published_revision=d.revision where id=d.id;
  return to_jsonb(p);
end $$;

create function public.blog_unpublish(p_id uuid)
returns void language plpgsql set search_path = public as $$
begin
  perform 1 from blog_drafts where id=p_id for update;
  delete from blog_publications where draft_id=p_id;
  update blog_drafts set published_revision=null where id=p_id;
end $$;

create function public.blog_schedule(p_enabled boolean)
returns jsonb language plpgsql set search_path = public as $$
declare s blog_settings;
begin
  select * into s from blog_settings where id=true for update;
  if p_enabled and not s.trial_completed then raise exception 'Complete a generation and email trial first.'; end if;
  update blog_settings set schedule_enabled=p_enabled,
    next_run_on=case when p_enabled then (now() at time zone 'Asia/Kolkata')::date+1 else null end
    where id=true returning * into s;
  return to_jsonb(s);
end $$;

-- PostgreSQL grants new functions to PUBLIC by default; remove that access explicitly.
revoke all on function public.blog_start_generation(uuid,boolean), public.blog_finish_generation(uuid,jsonb),
 public.blog_fail_generation(uuid,text), public.blog_save_draft(uuid,int,jsonb), public.blog_begin_email(uuid,int),
 public.blog_complete_email(uuid,int,uuid,text), public.blog_publish(uuid,int,text), public.blog_unpublish(uuid), public.blog_schedule(boolean)
 from public, anon, authenticated;
grant execute on function public.blog_start_generation(uuid,boolean), public.blog_finish_generation(uuid,jsonb),
 public.blog_fail_generation(uuid,text), public.blog_save_draft(uuid,int,jsonb), public.blog_begin_email(uuid,int),
 public.blog_complete_email(uuid,int,uuid,text), public.blog_publish(uuid,int,text), public.blog_unpublish(uuid), public.blog_schedule(boolean)
 to service_role;
