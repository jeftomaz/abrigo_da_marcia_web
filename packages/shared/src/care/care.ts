import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mapAuditMetadata } from '../admin/audit'
import type { AuditMetadata } from '../admin/audit'
import type { Json, Tables, TablesInsert } from '../database.types'
import { supabase } from '../supabase/client'

export type CareScope = 'todos' | 'selecionados'
export type CareStatus = 'pendente' | 'em_andamento' | 'concluido' | 'suspenso' | 'dispensado'
export type CareRecordType = 'aplicacao' | 'inicio' | 'observacao' | 'conclusao'
export type CareIntervalUnit = 'hora' | 'dia' | 'semana' | 'mes' | 'ano'

export type CareCategory = {
  active: boolean
  audit: AuditMetadata | null
  id: string
  name: string
}

export type CareFrequency = {
  active: boolean
  audit: AuditMetadata | null
  id: string
  intervalCount: number
  intervalUnit: CareIntervalUnit
  label: string
  predefined: boolean
}

export type CareItem = {
  active: boolean
  audit: AuditMetadata | null
  category: string
  frequencyId: string
  frequencyLabel: string
  id: string
  name: string
  notes: string
  stockQuantity: number
}

export type CareProgram = {
  active: boolean
  audit: AuditMetadata | null
  defaultDose: string
  endDate: string
  id: string
  instructions: string
  itemId: string
  name: string
  scope: CareScope
  startDate: string
}

export type DogCare = {
  audit: AuditMetadata | null
  dogId: string
  dose: string
  endDate: string
  exceptionReason: string
  id: string
  nextDueAt: string
  programId: string
  startDate: string
  status: CareStatus
}

export type CareRecord = {
  assignmentId: string
  audit: AuditMetadata | null
  dose: string
  id: string
  itemCategory: string
  itemFrequency: string
  itemName: string
  lot: string
  nextDueAt: string
  notes: string
  occurredAt: string
  stockQuantityUsed: number | null
  type: CareRecordType
}

export type CareItemDraft = Omit<CareItem, 'audit' | 'frequencyLabel' | 'id'> & {
  expectedUpdatedAt: string
  id?: string
  stockAdjustmentReason: string
}
export type CareCategoryDraft = Omit<CareCategory, 'audit' | 'id'> & { id?: string }
export type CareFrequencyDraft = Omit<CareFrequency, 'audit' | 'id' | 'label' | 'predefined'> & { id?: string }
export type CareProgramDraft = Omit<CareProgram, 'audit' | 'id'> & {
  dogIds: string[]
  id?: string
}
export type CareRecordDraft = {
  assignmentId: string
  dose: string
  lot: string
  nextDueAt: string
  notes: string
  occurredAt: string
  stockQuantityUsed: number | null
  type: CareRecordType
}

export type AdminCareData = {
  assignments: DogCare[]
  categories: CareCategory[]
  frequencies: CareFrequency[]
  items: CareItem[]
  programs: CareProgram[]
}

export const CARE_STATUS_LABELS: Record<CareStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  suspenso: 'Suspenso',
  dispensado: 'Dispensado',
}

export const CARE_RECORD_TYPE_LABELS: Record<CareRecordType, string> = {
  aplicacao: 'Aplicação realizada',
  inicio: 'Tratamento iniciado',
  observacao: 'Observação',
  conclusao: 'Tratamento concluído',
}

export function currentLocalDateTime() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

const adminCareKey = ['care', 'admin'] as const
const careCategoriesKey = ['care', 'categories'] as const
const careFrequenciesKey = ['care', 'frequencies'] as const
const careIntervalOrder: Record<CareIntervalUnit, number> = {
  hora: 0,
  dia: 1,
  semana: 2,
  mes: 3,
  ano: 4,
}

const careIntervalLabels: Record<CareIntervalUnit, [string, string]> = {
  ano: ['ano', 'anos'],
  dia: ['dia', 'dias'],
  hora: ['hora', 'horas'],
  mes: ['mês', 'meses'],
  semana: ['semana', 'semanas'],
}

function sortCareFrequencies(frequencies: CareFrequency[]) {
  return frequencies.sort((left, right) => (
    careIntervalOrder[left.intervalUnit] - careIntervalOrder[right.intervalUnit]
    || left.intervalCount - right.intervalCount
  ))
}

export function formatCareFrequency(frequency: Pick<CareFrequency, 'intervalCount' | 'intervalUnit'> | undefined) {
  if (!frequency) return ''
  const labels = careIntervalLabels[frequency.intervalUnit]
  const label = frequency.intervalCount === 1 ? labels[0] : labels[1]
  return `A cada ${frequency.intervalCount} ${label}`
}

function mapCareFrequency(row: Tables<'cuidado_frequencias'>): CareFrequency {
  return {
    active: row.active,
    audit: mapAuditMetadata(row),
    id: row.id,
    intervalCount: row.interval_count,
    intervalUnit: row.interval_unit,
    label: formatCareFrequency({ intervalCount: row.interval_count, intervalUnit: row.interval_unit }),
    predefined: row.predefined,
  }
}

function mapCareCategory(row: Tables<'cuidado_categorias'>): CareCategory {
  return {
    active: row.active,
    audit: mapAuditMetadata(row),
    id: row.id,
    name: row.name,
  }
}

function mapCareItem(
  row: Tables<'cuidado_itens'>,
  frequencyById: Map<string, CareFrequency>,
): CareItem {
  return {
    active: row.active,
    audit: mapAuditMetadata(row),
    category: row.category,
    frequencyId: row.frequency_id ?? '',
    frequencyLabel: formatCareFrequency(row.frequency_id ? frequencyById.get(row.frequency_id) : undefined),
    id: row.id,
    name: row.name,
    notes: row.notes ?? '',
    stockQuantity: row.stock_quantity,
  }
}

function mapCareProgram(row: Tables<'cuidado_programas'>): CareProgram {
  return {
    active: row.active,
    audit: mapAuditMetadata(row),
    defaultDose: row.default_dose ?? '',
    endDate: row.end_date ?? '',
    id: row.id,
    instructions: row.instructions ?? '',
    itemId: row.item_id,
    name: row.name,
    scope: row.scope,
    startDate: row.start_date ?? '',
  }
}

function mapDogCare(row: Tables<'cae_cuidados'>): DogCare {
  return {
    audit: mapAuditMetadata(row),
    dogId: row.dog_id,
    dose: row.dose ?? '',
    endDate: row.end_date ?? '',
    exceptionReason: row.exception_reason ?? '',
    id: row.id,
    nextDueAt: row.next_due_at ?? '',
    programId: row.program_id,
    startDate: row.start_date ?? '',
    status: row.status,
  }
}

function mapCareRecord(row: Tables<'cae_cuidado_registros'>): CareRecord {
  return {
    assignmentId: row.assignment_id,
    audit: mapAuditMetadata(row),
    dose: row.dose ?? '',
    id: row.id,
    itemCategory: row.item_category,
    itemFrequency: row.item_frequency ?? '',
    itemName: row.item_name,
    lot: row.lot ?? '',
    nextDueAt: row.next_due_at ?? '',
    notes: row.notes ?? '',
    occurredAt: row.occurred_at,
    stockQuantityUsed: row.stock_quantity_used,
    type: row.type,
  }
}

async function listAdminCare(): Promise<AdminCareData> {
  const [categoriesResult, frequenciesResult, itemsResult, programsResult, assignmentsResult] = await Promise.all([
    supabase.from('cuidado_categorias').select('*').order('name'),
    supabase.from('cuidado_frequencias').select('*'),
    supabase.from('cuidado_itens').select('*').order('category').order('name'),
    supabase.from('cuidado_programas').select('*').order('active', { ascending: false }).order('name'),
    supabase.from('cae_cuidados').select('*').order('next_due_at', { ascending: true, nullsFirst: false }),
  ])

  const error = categoriesResult.error ?? frequenciesResult.error ?? itemsResult.error
    ?? programsResult.error ?? assignmentsResult.error
  if (error) throw error

  const frequencies = sortCareFrequencies((frequenciesResult.data ?? []).map(mapCareFrequency))
  const frequencyById = new Map(frequencies.map((frequency) => [frequency.id, frequency]))

  return {
    assignments: (assignmentsResult.data ?? []).map(mapDogCare),
    categories: (categoriesResult.data ?? []).map(mapCareCategory),
    frequencies,
    items: (itemsResult.data ?? []).map((item) => mapCareItem(item, frequencyById)),
    programs: (programsResult.data ?? []).map(mapCareProgram),
  }
}

async function listCareRecords(assignmentIds: string[]) {
  if (assignmentIds.length === 0) return []
  const { data, error } = await supabase
    .from('cae_cuidado_registros')
    .select('*')
    .in('assignment_id', assignmentIds)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapCareRecord)
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

async function saveCareItem(draft: CareItemDraft) {
  const { data, error } = await supabase.rpc('save_care_item', {
    p_active: draft.active,
    p_category: draft.category.trim(),
    p_name: draft.name.trim(),
    ...(draft.frequencyId ? { p_frequency_id: draft.frequencyId } : {}),
    ...(draft.id ? { p_item_id: draft.id } : {}),
    ...(draft.id ? { p_expected_updated_at: draft.expectedUpdatedAt } : {}),
    ...(draft.notes.trim() ? { p_notes: draft.notes.trim() } : {}),
    ...(draft.stockAdjustmentReason.trim()
      ? { p_stock_adjustment_reason: draft.stockAdjustmentReason.trim() }
      : {}),
    p_stock_quantity: draft.stockQuantity,
  })
  if (error) throw error
  return data
}

async function setCareItemActive(item: Pick<CareItem, 'active' | 'audit' | 'id'>) {
  if (!item.audit) throw new Error('Os dados do item estão desatualizados.')
  const { error } = await supabase.rpc('set_care_item_active', {
    p_active: item.active,
    p_expected_updated_at: item.audit.updatedAt,
    p_item_id: item.id,
  })
  if (error) throw error
}

async function saveCareProgram(draft: CareProgramDraft) {
  const defaultDose = draft.defaultDose.trim()
  const instructions = draft.instructions.trim()
  const { data, error } = await supabase.rpc('save_care_program', {
    p_active: draft.active,
    p_dog_ids: draft.scope === 'selecionados' ? draft.dogIds : [],
    p_item_id: draft.itemId,
    p_name: draft.name.trim(),
    p_scope: draft.scope,
    ...(defaultDose ? { p_default_dose: defaultDose } : {}),
    ...(draft.endDate ? { p_end_date: draft.endDate } : {}),
    ...(instructions ? { p_instructions: instructions } : {}),
    ...(draft.id ? { p_program_id: draft.id } : {}),
    ...(draft.startDate ? { p_start_date: draft.startDate } : {}),
  })
  if (error) throw error
  return data
}

async function saveCareRecord(draft: CareRecordDraft) {
  const values: TablesInsert<'cae_cuidado_registros'> = {
    assignment_id: draft.assignmentId,
    dose: nullable(draft.dose),
    lot: nullable(draft.lot),
    next_due_at: nullable(draft.nextDueAt),
    notes: nullable(draft.notes),
    occurred_at: draft.occurredAt,
    stock_quantity_used: draft.stockQuantityUsed,
    type: draft.type,
  }
  const { data, error } = await supabase
    .from('cae_cuidado_registros')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  return mapCareRecord(data)
}

async function listCareFrequencies() {
  const { data, error } = await supabase
    .from('cuidado_frequencias')
    .select('*')
  if (error) throw error
  return sortCareFrequencies((data ?? []).map(mapCareFrequency))
}

async function listCareCategories() {
  const { data, error } = await supabase
    .from('cuidado_categorias')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []).map(mapCareCategory)
}

async function saveCareCategories(categories: CareCategoryDraft[]) {
  const payload: Json = categories.map((category) => ({
    active: category.active,
    id: category.id ?? '',
    name: category.name.trim(),
  }))
  const { error } = await supabase.rpc('save_care_categories', { p_categories: payload })
  if (error) throw error
}

async function saveCareFrequencies(frequencies: CareFrequencyDraft[]) {
  const payload: Json = frequencies.map((frequency) => ({
    active: frequency.active,
    id: frequency.id ?? '',
    intervalCount: frequency.intervalCount,
    intervalUnit: frequency.intervalUnit,
  }))
  const { error } = await supabase.rpc('save_care_frequencies', { p_frequencies: payload })
  if (error) throw error
}

function useInvalidateAdminCare() {
  const queryClient = useQueryClient()
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: adminCareKey }),
    queryClient.invalidateQueries({ queryKey: ['care', 'records'] }),
  ])
}

export function useAdminCare() {
  return useQuery({ queryKey: adminCareKey, queryFn: listAdminCare })
}

export function useCareCategories() {
  return useQuery({ queryKey: careCategoriesKey, queryFn: listCareCategories })
}

export function useCareFrequencies() {
  return useQuery({ queryKey: careFrequenciesKey, queryFn: listCareFrequencies })
}

export function useCareRecords(assignmentIds: string[]) {
  const sortedIds = [...assignmentIds].sort()
  return useQuery({
    queryKey: ['care', 'records', sortedIds],
    queryFn: () => listCareRecords(sortedIds),
    enabled: sortedIds.length > 0,
  })
}

export function useSaveCareItem() {
  const invalidate = useInvalidateAdminCare()
  return useMutation({ mutationFn: saveCareItem, onSuccess: invalidate })
}

export function useSetCareItemActive() {
  const invalidate = useInvalidateAdminCare()
  return useMutation({ mutationFn: setCareItemActive, onSuccess: invalidate })
}

export function useSaveCareProgram() {
  const invalidate = useInvalidateAdminCare()
  return useMutation({ mutationFn: saveCareProgram, onSuccess: invalidate })
}

export function useSaveCareRecord() {
  const invalidate = useInvalidateAdminCare()
  return useMutation({ mutationFn: saveCareRecord, onSuccess: invalidate })
}

export function useSaveCareFrequencies() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveCareFrequencies,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: adminCareKey }),
      queryClient.invalidateQueries({ queryKey: careFrequenciesKey }),
    ]),
  })
}

export function useSaveCareCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveCareCategories,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: adminCareKey }),
      queryClient.invalidateQueries({ queryKey: careCategoriesKey }),
    ]),
  })
}
