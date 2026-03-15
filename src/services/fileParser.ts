import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import Tesseract from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''

  if (ext === 'pdf') {
    return extractFromPDF(file)
  } else if (ext === 'docx') {
    return extractFromDocx(file)
  } else if (ext === 'pptx') {
    return extractFromPptx(file)
  } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext)) {
    return extractFromImage(file)
  } else if (['txt', 'md', 'csv'].includes(ext)) {
    return file.text()
  } else {
    throw new Error(`未対応のファイル形式です: .${ext}`)
  }
}

async function extractFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }

  return pages.join('\n\n')
}

async function extractFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function extractFromPptx(file: File): Promise<string> {
  // mammoth doesn't support pptx natively, but we can try extracting XML
  // For now, treat as a zip and extract text from slides
  const arrayBuffer = await file.arrayBuffer()
  try {
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  } catch {
    // Fallback: try reading as text
    return file.text()
  }
}

async function extractFromImage(file: File): Promise<string> {
  const { data } = await Tesseract.recognize(file, 'jpn+eng')
  return data.text
}
