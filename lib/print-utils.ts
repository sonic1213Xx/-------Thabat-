import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

async function waitForImage(image: HTMLImageElement) {
  if (!image.complete) {
    await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }
  if (image.naturalWidth) await image.decode().catch(() => undefined)
}

async function makeSignatureBlack(image: HTMLImageElement) {
  await waitForImage(image)
  if (!image.naturalWidth || !image.naturalHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(image, 0, 0)
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = '#111827'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalCompositeOperation = 'source-over'
  return canvas.toDataURL('image/png')
}

export async function downloadOnePagePdf(root: HTMLElement, filename: string): Promise<void> {
  if ('fonts' in document) await document.fonts.ready
  const signatures = Array.from(root.querySelectorAll<HTMLImageElement>('.pdf-signature'))
  const originalSources = signatures.map((image) => image.src)

  try {
    await Promise.all(signatures.map(async (image) => {
      const normalized = await makeSignatureBlack(image)
      if (normalized) image.src = normalized
    }))
    await Promise.all(Array.from(root.querySelectorAll('img')).map(waitForImage))

    const canvas = await html2canvas(root, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (_document, clonedRoot) => {
        clonedRoot.querySelectorAll('.pdf-hidden, .print-toolbar').forEach((element) => element.remove())
        const documentRoot = clonedRoot as HTMLElement
        documentRoot.style.backgroundColor = '#ffffff'
        documentRoot.style.color = '#111827'
        documentRoot.querySelectorAll<HTMLElement>('*').forEach((element) => { element.style.color = '#111827' })
        documentRoot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((field) => {
          field.style.backgroundColor = '#ffffff'
          field.style.borderColor = '#111827'
          field.style.color = '#111827'
        })
      },
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 8
    const fit = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height)
    const width = canvas.width * fit
    const height = canvas.height * fit
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, 'FAST')
    pdf.save(filename)
  } finally {
    signatures.forEach((image, index) => { image.src = originalSources[index] })
  }
}