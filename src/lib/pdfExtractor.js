import * as pdfjsLib from 'pdfjs-dist'

// Use CDN worker matched to installed version — avoids Vite bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const totalPages = pdf.numPages
  const pages = []

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    const pageText = textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    pages.push({ pageNumber: i, text: pageText })

    onProgress?.({ current: i, total: totalPages, phase: 'parsing' })
  }

  return {
    totalPages,
    pages,
    fullText: pages.map(p => p.text).join('\n\n'),
  }
}
