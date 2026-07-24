import { execFileSync } from 'node:child_process'

// Os testes falam com o Postgres local pelo container do Supabase CLI, e não pela
// service_role key: nenhuma credencial administrativa precisa existir no repositório.
const CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_abrigo_da_marcia_web'

export const MARCA_E2E = 'E2E'

export function executarSql(sql: string) {
  return execFileSync(
    'docker',
    ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  ).trim()
}

export function limparResiduosE2E() {
  executarSql(`delete from public.reservas where customer_name like '${MARCA_E2E} %'`)
}
