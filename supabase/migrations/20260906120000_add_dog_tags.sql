alter table public.caes
  add column tags text[] not null default '{}';

create function public.normalize_dog_tags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  normalized_tags text[];
begin
  select coalesce(array_agg(tag order by position), '{}')
    into normalized_tags
  from (
    select lower(regexp_replace(btrim(raw_tag, E' #\t\n\r'), '[[:space:]]+', ' ', 'g')) as tag,
           position
    from unnest(new.tags) with ordinality as input(raw_tag, position)
  ) normalized;

  if cardinality(normalized_tags) > 12 then
    raise exception 'Cada cão pode ter no máximo 12 tags.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(normalized_tags) tag
    where tag = '' or char_length(tag) > 30 or tag ~ '[[:cntrl:]]'
  ) then
    raise exception 'Cada tag deve ter entre 1 e 30 caracteres.' using errcode = '23514';
  end if;

  if cardinality(normalized_tags) <> (
    select count(distinct tag) from unnest(normalized_tags) tag
  ) then
    raise exception 'As tags do cão não podem se repetir.' using errcode = '23514';
  end if;

  new.tags := normalized_tags;
  return new;
end;
$$;

revoke all on function public.normalize_dog_tags() from public;

create trigger caes_normalize_tags
before insert or update of tags on public.caes
for each row execute function public.normalize_dog_tags();

create index caes_tags_idx on public.caes using gin (tags);
