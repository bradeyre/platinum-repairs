import { NextRequest, NextResponse } from 'next/server'
import { generateDamageReportPDF } from '@/lib/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const { damageReportId } = await request.json()
    console.log('PDF Generation Request:', { damageReportId })

    if (!damageReportId) {
      console.log('Missing damageReportId')
      return NextResponse.json(
        { error: 'Damage report ID is required' },
        { status: 400 }
      )
    }

    console.log('Starting PDF generation for:', damageReportId)
    // Generate the HTML for PDF
    const html = await generateDamageReportPDF(damageReportId)
    console.log('HTML generated successfully, length:', html.length)

    // Return the HTML as a response
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="damage-report-${damageReportId}.html"`,
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

    console.log('Starting PDF generation for:', damageReportId)
    // Generate the HTML for PDF
    const html = await generateDamageReportPDF(damageReportId)
    console.log('HTML generated successfully, length:', html.length)

    // Return the HTML as a response
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="damage-report-${damageReportId}.html"`,
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
