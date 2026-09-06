#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_PID=""
ADMIN_PID=""
LOCAL_ADMIN_ENV_FILE=""

cleanup() {
  trap - EXIT INT TERM
  [[ -n "$PUBLIC_PID" ]] && kill "$PUBLIC_PID" 2>/dev/null || true
  [[ -n "$ADMIN_PID" ]] && kill "$ADMIN_PID" 2>/dev/null || true
  wait "$PUBLIC_PID" "$ADMIN_PID" 2>/dev/null || true
  [[ -n "$LOCAL_ADMIN_ENV_FILE" ]] && rm -f "$LOCAL_ADMIN_ENV_FILE"
}

trap cleanup EXIT INT TERM
cd "$ROOT_DIR"

command -v pnpm >/dev/null || {
  echo "Erro: pnpm não encontrado."
  exit 1
}
command -v supabase >/dev/null || {
  echo "Erro: Supabase CLI não encontrada."
  exit 1
}

echo "Iniciando Supabase local..."
supabase start >/dev/null

echo "Provisionando acesso administrativo local..."
LOCAL_ADMIN_ENV_FILE="$(mktemp -t abrigo-local-admin)"
node scripts/provision-local-admin.mjs > "$LOCAL_ADMIN_ENV_FILE"
source "$LOCAL_ADMIN_ENV_FILE"
rm -f "$LOCAL_ADMIN_ENV_FILE"
LOCAL_ADMIN_ENV_FILE=""

echo
echo "Público: http://127.0.0.1:5173"
echo "Adoção: http://127.0.0.1:5173/adocao"
echo "Admin:   http://127.0.0.1:5174/#/"
echo "Acesso:  clique em \"Entrar no ambiente local\""
echo "Studio:  http://127.0.0.1:54323"
echo
echo "Pressione Ctrl+C para encerrar os dois sites."

VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
  pnpm --filter public exec vite --host 127.0.0.1 --port 5173 --strictPort &
PUBLIC_PID=$!
VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
VITE_LOCAL_ADMIN_EMAIL="$VITE_LOCAL_ADMIN_EMAIL" \
VITE_LOCAL_ADMIN_PASSWORD="$VITE_LOCAL_ADMIN_PASSWORD" \
VITE_LOCAL_ADMIN_TOTP_SECRET="$VITE_LOCAL_ADMIN_TOTP_SECRET" \
  pnpm --filter admin exec vite --host 127.0.0.1 --port 5174 --strictPort &
ADMIN_PID=$!

while kill -0 "$PUBLIC_PID" 2>/dev/null && kill -0 "$ADMIN_PID" 2>/dev/null; do
  sleep 1
done

echo "Um dos sites foi encerrado; finalizando o ambiente local."
exit 1
