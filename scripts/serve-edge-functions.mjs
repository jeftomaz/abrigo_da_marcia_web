import { spawn } from 'node:child_process'
import { createServer } from 'node:http'

const edge = spawn('supabase', ['functions', 'serve', '--no-verify-jwt'], { stdio: 'inherit' })
const endpoint = 'http://127.0.0.1:54321/functions/v1/activate-event'
const deadline = Date.now() + 120_000

async function waitUntilReady() {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint, {
        method: 'OPTIONS',
        headers: { Origin: 'http://127.0.0.1:5174' },
      })
      if (response.status !== 503) return
    } catch {
      // O gateway local ainda não encaminhou a função.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('O runtime local das Edge Functions não respondeu em 120 segundos.')
}

try {
  await waitUntilReady()
} catch (error) {
  edge.kill('SIGTERM')
  throw error
}

const healthServer = createServer((_request, response) => {
  response.writeHead(204)
  response.end()
})

healthServer.listen(54329, '127.0.0.1')

function stop() {
  edge.kill('SIGTERM')
  healthServer.close(() => process.exit(0))
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
edge.on('exit', (code) => {
  healthServer.close(() => process.exit(code ?? 1))
})
