create function public.valid_recurring_donation_urls(urls jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(urls) = 'object'
    and not exists (
      select 1
      from jsonb_each_text(urls) entry
      where entry.key not in ('10', '20', '30', '50', '100', '150')
        or entry.value !~* '^https://'
    );
$$;

drop view public.site_settings_public;

alter table public.site_settings
  drop column donation_url,
  add column donation_pix_key text,
  add column donation_pix_receiver text,
  add column donation_pix_city text,
  add column recurring_donation_urls jsonb not null default '{}'::jsonb,
  add constraint site_settings_donation_pix_key_check
    check (donation_pix_key is null or char_length(btrim(donation_pix_key)) between 1 and 77),
  add constraint site_settings_donation_pix_receiver_check
    check (donation_pix_receiver is null or char_length(btrim(donation_pix_receiver)) between 1 and 25),
  add constraint site_settings_donation_pix_city_check
    check (donation_pix_city is null or char_length(btrim(donation_pix_city)) between 1 and 15),
  add constraint site_settings_donation_pix_complete_check
    check (
      (donation_pix_key is null and donation_pix_receiver is null and donation_pix_city is null)
      or (donation_pix_key is not null and donation_pix_receiver is not null and donation_pix_city is not null)
    ),
  add constraint site_settings_recurring_donation_urls_check
    check (public.valid_recurring_donation_urls(recurring_donation_urls));

create view public.site_settings_public as
  select adoption_form_url, volunteer_form_url, donation_pix_key,
    donation_pix_receiver, donation_pix_city, recurring_donation_urls
  from public.site_settings
  where singleton;

grant select on public.site_settings_public to anon, authenticated;
