import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export async function generateOffrePDF(data: {
  client: string
  poste: string
  template: string
  fields: Record<string, any>
}): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  let yPosition = height - 80

  // Header
  page.drawText("OFFRE COMMERCIALE", {
    x: 50,
    y: yPosition,
    size: 24,
    font: fontBold,
    color: rgb(0.1, 0.22, 1), // Blue MGRH
  })

  yPosition -= 40

  // Client info
  page.drawText(`Client: ${data.client}`, {
    x: 50,
    y: yPosition,
    size: 14,
    font: fontBold,
  })

  yPosition -= 25

  page.drawText(`Poste: ${data.poste}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font,
  })

  yPosition -= 25

  page.drawText(`Template: ${data.template}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font,
  })

  yPosition -= 40

  // Separator line
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })

  yPosition -= 30

  // Fields
  page.drawText("Détails de l'offre:", {
    x: 50,
    y: yPosition,
    size: 14,
    font: fontBold,
  })

  yPosition -= 25

  for (const [key, value] of Object.entries(data.fields)) {
    if (yPosition < 100) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([595, 842])
      yPosition = height - 80
    }

    const displayKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

    page.drawText(`${displayKey}: ${value || "N/A"}`, {
      x: 70,
      y: yPosition,
      size: 11,
      font,
    })

    yPosition -= 20
  }

  // Footer
  page.drawText(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, {
    x: 50,
    y: 50,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  })

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

export function generateSignedUrl(pdfPath: string, expiresIn = 3600): string {
  // In production, this would generate a real signed URL with expiration
  // For now, we'll simulate it with a timestamp
  const expiresAt = Date.now() + expiresIn * 1000
  return `${pdfPath}?expires=${expiresAt}&signature=mock_signature`
}

export function isUrlExpired(url: string): boolean {
  const urlObj = new URL(url, "http://localhost")
  const expires = urlObj.searchParams.get("expires")
  if (!expires) return false
  return Date.now() > Number.parseInt(expires)
}
