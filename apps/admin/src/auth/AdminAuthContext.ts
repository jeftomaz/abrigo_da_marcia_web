import { createContext, useContext } from 'react'

export type AdminAuthValue = {
  displayName: string
  email: string
  factorId: string
  removeAuthenticator: () => Promise<void>
  signOut: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null)

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth deve ser usado dentro de AdminAuth.')
  return context
}
