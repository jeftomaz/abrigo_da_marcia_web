import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mapAuditMetadata } from '../admin/audit'
import type { AuditMetadata } from '../admin/audit'
import { supabase } from '../supabase/client'

export type SiteSettings = {
  audit?: AuditMetadata | null
  adoptionFormUrl: string
  pixCity: string
  pixKey: string
  pixReceiver: string
  recurringDonationUrls: Record<string, string>
  volunteerFormUrl: string
}

export type SocialLinks = {
  audit?: AuditMetadata | null
  facebook: string
  instagram: string
}

const adminSiteSettingsKey = ['settings', 'site', 'admin'] as const
const publicSiteSettingsKey = ['settings', 'site', 'public'] as const
const adminSocialLinksKey = ['settings', 'social', 'admin'] as const
const publicSocialLinksKey = ['settings', 'social', 'public'] as const

function mapSiteSettings(row: {
  adoption_form_url: string | null
  pix_city: string | null
  pix_key: string | null
  pix_receiver: string | null
  recurring_donation_urls: unknown
  updated_at?: string | null
  updated_by_name?: string | null
  volunteer_form_url: string | null
}): SiteSettings {
  if (!row.adoption_form_url) throw new Error('O link global de adoção não foi configurado.')
  return {
    audit: mapAuditMetadata(row),
    adoptionFormUrl: row.adoption_form_url,
    pixCity: row.pix_city ?? '',
    pixKey: row.pix_key ?? '',
    pixReceiver: row.pix_receiver ?? '',
    recurringDonationUrls: row.recurring_donation_urls && typeof row.recurring_donation_urls === 'object' && !Array.isArray(row.recurring_donation_urls)
      ? row.recurring_donation_urls as Record<string, string>
      : {},
    volunteerFormUrl: row.volunteer_form_url ?? '',
  }
}

async function loadSiteSettings(isPublic: boolean) {
  const { data, error } = isPublic
    ? await supabase.from('site_settings_public')
        .select('adoption_form_url, pix_city, pix_key, pix_receiver, recurring_donation_urls, volunteer_form_url')
        .single()
    : await supabase.from('site_settings')
        .select('adoption_form_url, pix_city, pix_key, pix_receiver, recurring_donation_urls, volunteer_form_url, updated_at, updated_by_name')
        .single()
  if (error) throw error
  return mapSiteSettings(data)
}

async function saveSiteSettings(settings: SiteSettings) {
  const { error } = await supabase.from('site_settings').update({
    adoption_form_url: settings.adoptionFormUrl.trim(),
    pix_city: settings.pixCity.trim() || null,
    pix_key: settings.pixKey.trim() || null,
    pix_receiver: settings.pixReceiver.trim() || null,
    recurring_donation_urls: settings.recurringDonationUrls,
    volunteer_form_url: settings.volunteerFormUrl.trim() || null,
  }).eq('singleton', true)
  if (error) throw error
}

async function loadSocialLinks(isPublic: boolean): Promise<SocialLinks> {
  const { data, error } = isPublic
    ? await supabase.from('social_links_public').select('network, url').order('display_order')
    : await supabase.from('social_links').select('network, url, updated_at, updated_by_name').order('display_order')
  if (error) throw error
  const auditRow = (data as Array<{ updated_at?: string | null; updated_by_name?: string | null }>)
    .filter((row) => row.updated_at)
    .sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)))[0]
  const links: SocialLinks = { audit: auditRow ? mapAuditMetadata(auditRow) : null, facebook: '', instagram: '' }
  data.forEach(({ network, url }) => {
    if (network === 'facebook' || network === 'instagram') links[network] = url ?? ''
  })
  return links
}

async function saveSocialLinks(links: SocialLinks) {
  const results = await Promise.all(
    (['facebook', 'instagram'] as const).map((network) =>
      supabase.from('social_links').update({ url: links[network].trim() || null }).eq('network', network),
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
