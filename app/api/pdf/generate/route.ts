import { NextRequest, NextResponse } from 'next/server'
import { generateDamageReportPDF } from '@/lib/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const { damageReportId } = await request.json()

    if (!damageReportId) {
      return NextResponse.json(
        { error: 'Damage report ID is required' },
        { status: 400 }
      )
    }

    // Generate the PDF
    const pdfBuffer = await generateDamageReportPDF(damageReportId)

    // Return the PDF as a response
    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="damage-report-${damageReportId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const damageReportId = searchParams.get('id')

    if (!damageReportId) {
      return NextResponse.json(
        { error: 'Damage report ID is required' },
        { status: 400 }
      )
    }

    // Generate the PDF
    const pdfBuffer = await generateDamageReportPDF(damageReportId)

    // Return the PDF as a response
    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="damage-report-${damageReportId}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
