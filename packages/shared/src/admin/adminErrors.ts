export type AdminErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'CONFLICT'
  | 'CORS_ORIGIN_DENIED'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'METHOD_NOT_ALLOWED'
  | 'MFA_REQUIRED'
  | 'NETWORK_OR_CORS'
  | 'NOT_FOUND'
  | 'RESEND_ERROR'
  | 'SESSION_REQUIRED'
  | 'STORAGE_ERROR'
  | 'VALIDATION_ERROR'

type ErrorBody = { code?: unknown; message?: unknown; requestId?: unknown }

const KNOWN_CODES = new Set<AdminErrorCode>([
  'CONFIGURATION_ERROR',
  'CONFLICT',
  'CORS_ORIGIN_DENIED',
  'DATABASE_ERROR',
  'INTERNAL_ERROR',
  'METHOD_NOT_ALLOWED',
  'MFA_REQUIRED',
  'NETWORK_OR_CORS',
  'NOT_FOUND',
  'RESEND_ERROR',
  'SESSION_REQUIRED',
  'STORAGE_ERROR',
  'VALIDATION_ERROR',
])

export class AdminOperationError extends Error {
  readonly code: AdminErrorCode
  readonly requestId?: string
  readonly status?: number

  constructor(
    code: AdminErrorCode,
    message: string,
    requestId?: string,
    status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AdminOperationError'
    this.code = code
    this.requestId = requestId
    this.status = status
  }
}

function objectValue(error: unknown, key: string) {
  return error && typeof error === 'object' ? (error as Record<string, unknown>)[key] : undefined
}

function reference(requestId?: string) {
  return requestId ? ` Referência: ${requestId}.` : ''
}

export async function parseAdminFunctionError(error: unknown) {
  const context = objectValue(error, 'context')
  if (context instanceof Response) {
    const body = await context.clone().json().catch(() => null) as ErrorBody | null
    const code = typeof body?.code === 'string' && KNOWN_CODES.has(body.code as AdminErrorCode)
      ? body.code as AdminErrorCode
      : 'INTERNAL_ERROR'
    const message = typeof body?.message === 'string'
      ? body.message
      : 'A operação administrativa não pôde ser concluída.'
    const requestId = typeof body?.requestId === 'string'
      ? body.requestId
      : context.headers.get('x-request-id') ?? undefined
    return new AdminOperationError(code, message, requestId, context.status, { cause: error })
  }

  const message = objectValue(error, 'message')
  if (typeof message === 'string' && /failed to send|fetch|network/i.test(message)) {
    return new AdminOperationError(
      'NETWORK_OR_CORS',
      'Não foi possível alcançar a operação administrativa. Verifique a conexão e a configuração CORS.',
      undefined,
      undefined,
      { cause: error },
    )
  }
  return new AdminOperationError('INTERNAL_ERROR', 'A operação administrativa não pôde ser concluída.', undefined, undefined, { cause: error })
}

export function getAdminErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AdminOperationError) return `${error.message}${reference(error.requestId)}`

  const code = objectValue(error, 'code')
  const message = objectValue(error, 'message')
  const name = objectValue(error, 'name')
  const status = objectValue(error, 'statusCode') ?? objectValue(error, 'status')

  if (code === '42501' || status === 401 || status === 403) {
    return 'Sua sessão administrativa expirou ou precisa confirmar o MFA. Entre novamente.'
  }
  if (code === '23505' || code === '409') return 'Os dados conflitam com uma alteração já realizada. Atualize a página e tente novamente.'
  if (code === '23514' || code === '22P02' || code === 'P0001') {
    return typeof message === 'string' && message ? message : 'Os dados informados não atendem às regras da operação.'
  }
  if (name === 'StorageApiError' || typeof status === 'number' && typeof message === 'string' && /storage|bucket|object/i.test(message)) {
    return 'Não foi possível concluir a operação com as imagens. Verifique o Storage e tente novamente.'
  }
  if (typeof message === 'string' && /failed to send|fetch|network/i.test(message)) {
    return 'Não foi possível alcançar o serviço. Verifique a conexão e tente novamente.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
