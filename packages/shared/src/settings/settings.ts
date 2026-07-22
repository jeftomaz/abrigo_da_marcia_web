import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase/client'

export type SiteSettings = {
  adoptionFormUrl: string
  donationPixCity: string
  donationPixKey: string
  donationPixReceiver: string
  recurringDonationUrls: Record<string, string>
  volunteerFormUrl: string
}

export type SocialLinks = {
  facebook: string
  instagram: string
}

const adminSiteSettingsKey = ['settings', 'site', 'admin'] as const
const publicSiteSettingsKey = ['settings', 'site', 'public'] as const
const adminSocialLinksKey = ['settings', 'social', 'admin'] as const
const publicSocialLinksKey = ['settings', 'social', 'public'] as const

function mapSiteSettings(row: {
  adoption_form_url: string | null
  donation_pix_city: string | null
  donation_pix_key: string | null
  donation_pix_receiver: string | null
  recurring_donation_urls: unknown
  volunteer_form_url: string | null
}): SiteSettings {
  if (!row.adoption_form_url) throw new Error('O link global de adoção não foi configurado.')
  return {
    adoptionFormUrl: row.adoption_form_url,
    donationPixCity: row.donation_pix_city ?? '',
    donationPixKey: row.donation_pix_key ?? '',
    donationPixReceiver: row.donation_pix_receiver ?? '',
    recurringDonationUrls: row.recurring_donation_urls && typeof row.recurring_donation_urls === 'object' && !Array.isArray(row.recurring_donation_urls)
      ? row.recurring_donation_urls as Record<string, string>
      : {},
    volunteerFormUrl: row.volunteer_form_url ?? '',
  }
}

async function loadSiteSettings(isPublic: boolean) {
  const query = isPublic
    ? supabase.from('site_settings_public')
    : supabase.from('site_settings')
  const { data, error } = await query
    .select('adoption_form_url, donation_pix_city, donation_pix_key, donation_pix_receiver, recurring_donation_urls, volunteer_form_url')
    .single()
  if (error) throw error
  return mapSiteSettings(data)
}

async function saveSiteSettings(settings: SiteSettings) {
  const { error } = await supabase.from('site_settings').update({
    adoption_form_url: settings.adoptionFormUrl.trim(),
    donation_pix_city: settings.donationPixCity.trim() || null,
    donation_pix_key: settings.donationPixKey.trim() || null,
    donation_pix_receiver: settings.donationPixReceiver.trim() || null,
    recurring_donation_urls: settings.recurringDonationUrls,
    volunteer_form_url: settings.volunteerFormUrl.trim() || null,
  }).eq('singleton', true)
  if (error) throw error
}

async function loadSocialLinks(isPublic: boolean): Promise<SocialLinks> {
  const query = isPublic
    ? supabase.from('social_links_public')
    : supabase.from('social_links')
  const { data, error } = await query
    .select('network, url')
    .order('display_order')
  if (error) throw error
  const links: SocialLinks = { facebook: '', instagram: '' }
  data.forEach(({ network, url }) => {
    if (network === 'facebook' || network === 'instagram') links[network] = url ?? ''
  })
  return links
}

async function saveSocialLinks(links: SocialLinks) {
  const results = await Promise.all(
    (Object.entries(links) as [keyof SocialLinks, string][]).map(([network, url]) =>
      supabase.from('social_links').update({ url: url.trim() || null }).eq('network', network),
    ),
  )
  const error = results.find((result) => result.error)?.error
  if (error) throw error
}

export function useAdminSiteSettings() {
  return useQuery({ queryKey: adminSiteSettingsKey, queryFn: () => loadSiteSettings(false) })
}

export function usePublicSiteSettings() {
  return useQuery({
    queryKey: publicSiteSettingsKey,
    queryFn: () => loadSiteSettings(true),
    refetchInterval: 5_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useSaveSiteSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveSiteSettings,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: adminSiteSettingsKey }),
      queryClient.invalidateQueries({ queryKey: publicSiteSettingsKey }),
      queryClient.invalidateQueries({ queryKey: ['dogs'] }),
    ]),
  })
}

export function useAdminSocialLinks() {
  return useQuery({ queryKey: adminSocialLinksKey, queryFn: () => loadSocialLinks(false) })
}

export function usePublicSocialLinks() {
  return useQuery({
    queryKey: publicSocialLinksKey,
    queryFn: () => loadSocialLinks(true),
    refetchInterval: 5_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useSaveSocialLinks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveSocialLinks,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: adminSocialLinksKey }),
      queryClient.invalidateQueries({ queryKey: publicSocialLinksKey }),
    ]),
  })
}
