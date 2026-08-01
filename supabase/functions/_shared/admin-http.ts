export type AdminErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'CONFLICT'
  | 'CORS_ORIGIN_DENIED'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'MFA_REQUIRED'
  | 'NOT_FOUND'
  | 'RESEND_ERROR'
  | 'SESSION_REQUIRED'
  | 'STORAGE_ERROR'
  | 'VALIDATION_ERROR'

export class AdminFunctionError extends Error {
  constructor(
    readonly code: AdminErrorCode,
    message: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AdminFunctionError'
  }
}

type HandlerContext = { requestId: string }

const ALLOWED_HEADERS = 'authorization, apikey, content-type, x-client-info, x-supabase-api-version'
const LOCAL_ORIGINS = ['http://127.0.0.1:5174', 'http://localhost:5174']
const configuredOrigins = (Deno.env.get('ADMIN_ALLOWED_ORIGINS') ?? '')
  .split(',').map((origin) => origin.trim()).filter(Boolean)
const allowedOrigins = configuredOrigins.length ? configuredOrigins : LOCAL_ORIGINS

function requestIdFor(request: Request) {
  const supplied = request.headers.get('x-request-id')
  return supplied && /^[a-zA-Z0-9_-]{8,128}$/.test(supplied) ? supplied : crypto.randomUUID()
}

function originIsAllowed(request: Request) {
  const origin = request.headers.get('Origin')
  return !origin || allowedOrigins.includes(origin)
}

function responseHeaders(request: Request, requestId: string) {
  const origin = request.headers.get('Origin')
  const allowOrigin = originIsAllowed(request) ? origin : null
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'x-request-id',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    'x-request-id': requestId,
  }
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin
  return headers
}

function normalizeError(error: unknown) {
  if (error instanceof AdminFunctionError) return error
  const databaseCode = error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : ''
  if (databaseCode === '23505') {
    return new AdminFunctionError('CONFLICT', 'A operação conflita com uma alteração já realizada.', 409, { cause: error })
  }
  if (databaseCode === '23514' || databaseCode === '22P02' || databaseCode === 'P0001') {
    return new AdminFunctionError('VALIDATION_ERROR', 'Os dados enviados não atendem às regras da operação.', 422, { cause: error })
  }
  return new AdminFunctionError('INTERNAL_ERROR', 'A operação administrativa não pôde ser concluída.', 500, { cause: error })
}

function logFailure(functionName: string, requestId: string, error: AdminFunctionError) {
  const cause = error.cause && typeof error.cause === 'object'
    ? {
        name: 'name' in error.cause ? String(error.cause.name) : undefined,
        code: 'code' in error.cause ? String(error.cause.code) : undefined,
      }
    : undefined
  console.error(JSON.stringify({
    level: 'error',
    function: functionName,
    requestId,
    code: error.code,
    status: error.status,
    cause,
  }))
}

export async function handleAdminRequest<T extends Record<string, unknown>>(
  request: Request,
  functionName: string,
  handler: (request: Request, context: HandlerContext) => Promise<T>,
) {
  const requestId = requestIdFor(request)
  const headers = responseHeaders(request, requestId)
  try {
    if (!originIsAllowed(request)) {
      throw new AdminFunctionError('CORS_ORIGIN_DENIED', 'Origem não autorizada para a gestão.', 403)
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') {
      throw new AdminFunctionError('METHOD_NOT_ALLOWED', 'Método não permitido.', 405)
    }
    return Response.json(await handler(request, { requestId }), { headers })
  } catch (caughtError) {
    const error = normalizeError(caughtError)
    logFailure(functionName, requestId, error)
    return Response.json({ code: error.code, message: error.message, requestId }, {
      status: error.status,
      headers,
    })
  }
}
