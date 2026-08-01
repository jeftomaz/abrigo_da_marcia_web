export type AuditMetadata = {
  updatedAt: string
  updatedByName: string
}

export function mapAuditMetadata(row: unknown): AuditMetadata | null {
  const auditRow = row as { updated_at?: string | null; updated_by_name?: string | null }
  if (!auditRow.updated_at || !auditRow.updated_by_name) return null
  return { updatedAt: auditRow.updated_at, updatedByName: auditRow.updated_by_name }
}
