import { expect, test } from './fixtures'

// A compressão decide sozinha como gastar a verba de 500 KB: em resolução ou em
// qualidade. Já esteve invertida — gastava tudo em pixels e devolvia foto grande e
// borrada, a 0,81 bit/pixel. Estes testes travam os dois lados do contrato.
const CAMINHO_DO_MODULO = '/@fs' + process.cwd() + '/packages/shared/src/images/compressImage.ts'

const LIMITE_DE_BYTES = 500_000
const LADO_MAXIMO = 1600
const PISO_DE_QUALIDADE = 0.6

// Ruído puro é o pior caso para o encoder: não há área lisa para ele economizar bits,
// então força o algoritmo a escolher entre encolher e degradar.
async function comprimirRuido(page: import('@playwright/test').Page, largura: number, altura: number) {
  return page.evaluate(
    async ({ largura, altura, modulo, piso }) => {
      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura
      const contexto = canvas.getContext('2d')!
      const dados = contexto.createImageData(largura, altura)
      for (let i = 0; i < dados.data.length; i += 4) {
        dados.data[i] = Math.random() * 255
        dados.data[i + 1] = Math.random() * 255
        dados.data[i + 2] = Math.random() * 255
        dados.data[i + 3] = 255
      }
      contexto.putImageData(dados, 0, 0)

      const origem = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), 'image/jpeg', 0.95))
      const arquivo = new File([origem], 'ruido.jpg', { type: 'image/jpeg' })

      const { compressImage } = await import(/* @vite-ignore */ modulo)
      const saida: File = await compressImage(arquivo)
      const bitmap = await createImageBitmap(saida)

      // Reencoda a saída no piso de qualidade: se o algoritmo tivesse cruzado o piso,
      // o arquivo devolvido seria menor do que este. A sonda usa o formato que a própria
      // implementação escolheu — pedir WebP no Safari devolveria PNG e invalidaria a comparação.
      const noPiso = await new Promise<Blob>((resolver) => {
        const c = document.createElement('canvas')
        c.width = bitmap.width
        c.height = bitmap.height
        c.getContext('2d')!.drawImage(bitmap, 0, 0)
        c.toBlob((b) => resolver(b!), saida.type, piso)
      })

      const resultado = {
        bytes: saida.size,
        tipo: saida.type,
        nome: saida.name,
        largura: bitmap.width,
        altura: bitmap.height,
        bytesNoPiso: noPiso.size,
      }
      bitmap.close()
      return resultado
    },
    { largura, altura, modulo: CAMINHO_DO_MODULO, piso: PISO_DE_QUALIDADE },
  )
}

test.describe('compressão de imagens', () => {
  test('foto grande cabe na verba sem estourar a resolução nem furar o piso de qualidade', async ({ page }) => {
    await page.goto('/')
    const r = await comprimirRuido(page, 3024, 4032)

    expect(r.bytes, 'excede a verba de 500 KB').toBeLessThanOrEqual(LIMITE_DE_BYTES)
    expect(Math.max(r.largura, r.altura), 'resolução acima do teto').toBeLessThanOrEqual(LADO_MAXIMO)
    // O defeito original: manter a resolução no teto e derrubar a qualidade para caber.
    expect(r.bytes, 'qualidade abaixo do piso — a verba foi gasta em resolução').toBeGreaterThanOrEqual(r.bytesNoPiso)
  })

  // O Safari devolve PNG quando se pede WebP, sem erro. Como PNG de foto é lossless,
  // a imagem só cabia na verba encolhendo — 3024x4032 virava 380x506. Aceitamos WebP
  // ou JPEG, nunca PNG: os dois respeitam o parâmetro de qualidade.
  test('reencoda para um formato com perda, nunca PNG, mesmo quando já caberia', async ({ page }) => {
    await page.goto('/')
    const r = await comprimirRuido(page, 400, 400)

    expect(['image/webp', 'image/jpeg'], `formato inesperado: ${r.tipo}`).toContain(r.tipo)
    expect(r.nome).toMatch(/\.(webp|jpg)$/)
    expect(r.bytes).toBeLessThanOrEqual(LIMITE_DE_BYTES)
  })

  // A regressão que motivou este arquivo: no Safari a foto de celular saía com 380px.
  test('preserva resolução utilizável em qualquer navegador', async ({ page }) => {
    await page.goto('/')
    const r = await comprimirRuido(page, 3024, 4032)

    // Ruído é o pior caso possível; ainda assim precisa sobrar resolução para o card
    // expandido e o lightbox. Foto real fica bem acima disto.
    expect(Math.max(r.largura, r.altura), 'resolução baixa demais para o lightbox').toBeGreaterThanOrEqual(600)
    expect(r.tipo, 'PNG indica que o formato pedido foi ignorado').not.toBe('image/png')
  })
})
