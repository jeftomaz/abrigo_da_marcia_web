import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mapAuditMetadata } from '../admin/audit'
import type { AuditMetadata } from '../admin/audit'
import type { Tables, TablesInsert } from '../database.types'
import { supabase } from '../supabase/client'

export type CareScope = 'todos' | 'selecionados'
export type CareStatus = 'pendente' | 'em_andamento' | 'concluido' | 'suspenso' | 'dispensado'
export type CareRecordType = 'aplicacao' | 'inicio' | 'observacao' | 'conclusao'

export type CareItem = {
  active: boolean
  audit: AuditMetadata | null
  category: string
  id: string
  name: string
  notes: string
  presentation: string
}

export type CareProgram = {
  active: boolean
  audit: AuditMetadata | null
  defaultDose: string
  defaultFrequency: string
  defaultIntervalDays: number | null
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
  frequency: string
  id: string
  nextDueOn: string
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
  itemName: string
  itemPresentation: string
  lot: string
  nextDueOn: string
  notes: string
  occurredAt: string
  type: CareRecordType
}

export type CareItemDraft = Omit<CareItem, 'audit' | 'id'> & { id?: string }
export type CareProgramDraft = Omit<CareProgram, 'audit' | 'id'> & {
  dogIds: string[]
  id?: string
}
export type CareRecordDraft = {
  assignmentId: string
  dose: string
  lot: string
  nextDueOn: string
  notes: string
  occurredAt: string
  type: CareRecordType
}

export type AdminCareData = {
  assignments: DogCare[]
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

const adminCareKey = ['care', 'admin'] as const

function mapCareItem(row: Tables<'cuidado_itens'>): CareItem {
  return {
    active: row.active,
    audit: mapAuditMetadata(row),
    category: row.category,
    id: row.id,
    name: row.name,
    notes: row.notes ?? '',
    presentation: row.presentation ?? '',
  }
}

function mapCareProgram(row: Tables<'cuidado_programas'>): CareProgram {
  return {
    active: row.active,
    audit: mapAuditMetadata(row),
    defaultDose: row.default_dose ?? '',
    defaultFrequency: row.default_frequency ?? '',
    defaultIntervalDays: row.default_interval_days,
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
    frequency: row.frequency ?? '',
    id: row.id,
    nextDueOn: row.next_due_on ?? '',
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
    itemName: row.item_name,
    itemPresentation: row.item_presentation ?? '',
    lot: row.lot ?? '',
    nextDueOn: row.next_due_on ?? '',
    notes: row.notes ?? '',
    occurredAt: row.occurred_at,
    type: row.type,
  }
}

async function listAdminCare(): Promise<AdminCareData> {
  const [itemsResult, programsResult, assignmentsResult] = await Promise.all([
    supabase.from('cuidado_itens').select('*').order('category').order('name'),
    supabase.from('cuidado_programas').select('*').order('active', { ascending: false }).order('name'),
    supabase.from('cae_cuidados').select('*').order('next_due_on', { ascending: true, nullsFirst: false }),
  ])

  const error = itemsResult.error ?? programsResult.error ?? assignmentsResult.error
  if (error) throw error

  return {
    assignments: (assignmentsResult.data ?? []).map(mapDogCare),
    items: (itemsResult.data ?? []).map(mapCareItem),
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
  const values: TablesInsert<'cuidado_itens'> = {
    active: draft.active,
    category: draft.category.trim(),
    name: draft.name.trim(),
    notes: nullable(draft.notes),
    presentation: nullable(draft.presentation),
  }
  const request = draft.id
    ? supabase.from('cuidado_itens').update(values).eq('id', draft.id).select().single()
    : supabase.from('cuidado_itens').insert(values).select().single()
  const { data, error } = await request
  if (error) throw error
  return mapCareItem(data)
}

async function setCareItemActive({ id, active }: Pick<CareItem, 'active' | 'id'>) {
  const { data, error } = await supabase
    .from('cuidado_itens')
    .update({ active })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapCareItem(data)
}

async function saveCareProgram(draft: CareProgramDraft) {
  const defaultDose = draft.defaultDose.trim()
  const defaultFrequency = draft.defaultFrequency.trim()
  const instructions = draft.instructions.trim()
  const { data, error } = await supabase.rpc('save_care_program', {
    p_active: draft.active,
    p_dog_ids: draft.scope === 'selecionados' ? draft.dogIds : [],
    p_item_id: draft.itemId,
    p_name: draft.name.trim(),
    p_scope: draft.scope,
    ...(defaultDose ? { p_default_dose: defaultDose } : {}),
    ...(defaultFrequency ? { p_default_frequency: defaultFrequency } : {}),
    ...(draft.defaultIntervalDays ? { p_default_interval_days: draft.defaultIntervalDays } : {}),
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
    next_due_on: nullable(draft.nextDueOn),
    notes: nullable(draft.notes),
    occurred_at: draft.occurredAt,
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
