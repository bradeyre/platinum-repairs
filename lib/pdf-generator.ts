import { supabaseAdmin } from '@/lib/supabase'
import puppeteer from 'puppeteer'

export interface DamageReportData {
  id: string
  dr_number: string
  claim_number?: string
  device_brand: string
  device_model: string
  device_type: string
  imei_serial?: string
  storage_capacity?: string
  color?: string
  client_reported_issues: string[]
  tech_findings: string[]
  damage_photos: string[]
  tech_ber_suggestion?: boolean
  manager_ber_decision?: boolean
  ber_reason?: string
  selected_parts: any
  total_parts_cost: number
  final_eta_days?: number
  manager_notes?: string
  ai_checklist?: string[]
  ai_risk_assessment?: string
  status: string
  priority: number
  assigned_tech_id: string
  assigned_tech?: {
    full_name: string
    bio: string
  }
  created_at: string
  updated_at: string
}

export async function generateDamageReportPDF(damageReportId: string): Promise<Buffer> {
  try {
    console.log('PDF Generator: Starting for damage report ID:', damageReportId)
    
    // Fetch the damage report with technician bio
    const { data: report, error } = await supabaseAdmin
      .from('damage_reports')
      .select(`
        *,
        assigned_tech:users!assigned_tech_id(full_name, bio)
      `)
      .eq('id', damageReportId)
      .single()

    console.log('PDF Generator: Supabase query result:', { report: !!report, error })

    if (error) {
      console.error('PDF Generator: Supabase error:', error)
      throw new Error(`Failed to fetch damage report: ${error.message}`)
    }

    if (!report) {
      console.error('PDF Generator: No report found for ID:', damageReportId)
      throw new Error('Damage report not found')
    }

    console.log('PDF Generator: Report found, generating HTML...')

    // Generate HTML for the PDF
    const html = generatePDFHTML(report)
    console.log('PDF Generator: HTML generated, length:', html.length)

    // Launch Puppeteer and generate PDF
    console.log('PDF Generator: Launching Puppeteer...')
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    console.log('PDF Generator: Puppeteer launched successfully')
    
    const page = await browser.newPage()
    console.log('PDF Generator: New page created')
    
    await page.setContent(html, { waitUntil: 'networkidle0' })
    console.log('PDF Generator: Content set, generating PDF...')
    
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    })
    console.log('PDF Generator: PDF generated, size:', pdf.length)
    
    await browser.close()
    console.log('PDF Generator: Browser closed, returning PDF')
    
    return pdf
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

function generatePDFHTML(report: DamageReportData): string {
  const currentDate = new Date().toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          color: #333;
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #0066cc; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .logo { 
          max-width: 200px; 
          margin-bottom: 10px;
        }
        .report-title {
          font-size: 24px;
          font-weight: bold;
          color: #0066cc;
          margin: 10px 0;
        }
        .report-number {
          font-size: 18px;
          color: #666;
        }
        .section { 
          margin: 25px 0; 
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #0066cc;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        .info-value {
          margin-top: 2px;
        }
        .photos { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 15px; 
          margin-top: 15px;
        }
        .photo { 
          max-width: 100%; 
          height: 200px; 
          object-fit: cover;
          border: 2px solid #ddd;
          border-radius: 8px;
        }
        .tech-bio { 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px;
          border-left: 4px solid #0066cc;
        }
        .tech-name {
          font-size: 16px;
          font-weight: bold;
          color: #0066cc;
          margin-bottom: 10px;
        }
        .tech-bio-text {
          color: #555;
          font-style: italic;
        }
        .classification {
          background: ${report.manager_ber_decision ? '#ffebee' : '#e8f5e8'};
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid ${report.manager_ber_decision ? '#f44336' : '#4caf50'};
        }
        .classification-title {
          font-weight: bold;
          color: ${report.manager_ber_decision ? '#d32f2f' : '#2e7d32'};
          margin-bottom: 5px;
        }
        .findings-list {
          list-style-type: disc;
          margin-left: 20px;
        }
        .parts-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 15px;
        }
        .parts-table th, .parts-table td { 
          border: 1px solid #ddd; 
          padding: 12px; 
          text-align: left; 
        }
        .parts-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="report-title">Platinum Repairs</div>
        <div class="report-number">Damage Report: ${report.dr_number || 'DR-' + report.id.substring(0, 8).toUpperCase()}</div>
        ${report.claim_number ? `<div style="color: #666; margin-top: 5px;">Claim Number: ${report.claim_number}</div>` : ''}
        <div style="color: #666; margin-top: 10px; font-size: 14px;">Generated on: ${currentDate}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Device Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Device:</div>
            <div class="info-value">${report.device_brand} ${report.device_model}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Device Type:</div>
            <div class="info-value">${report.device_type}</div>
          </div>
          ${report.imei_serial ? `
          <div class="info-item">
            <div class="info-label">IMEI/Serial:</div>
            <div class="info-value">${report.imei_serial}</div>
          </div>
          ` : ''}
          ${report.storage_capacity ? `
          <div class="info-item">
            <div class="info-label">Storage:</div>
            <div class="info-value">${report.storage_capacity}</div>
          </div>
          ` : ''}
          ${report.color ? `
          <div class="info-item">
            <div class="info-label">Color:</div>
            <div class="info-value">${report.color}</div>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Assessment & Classification</div>
        <div class="classification">
          <div class="classification-title">
            ${report.manager_ber_decision ? 'Beyond Economical Repair (BER)' : 'Repairable'}
          </div>
          ${report.ber_reason ? `<div style="margin-top: 8px;">Reason: ${report.ber_reason}</div>` : ''}
        </div>
        
        ${report.tech_findings && report.tech_findings.length > 0 ? `
        <div style="margin-top: 20px;">
          <div class="info-label">Technical Findings:</div>
          <ul class="findings-list">
            ${report.tech_findings.map(finding => `<li>${finding}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${report.client_reported_issues && report.client_reported_issues.length > 0 ? `
        <div style="margin-top: 20px;">
          <div class="info-label">Client Reported Issues:</div>
          <ul class="findings-list">
            ${report.client_reported_issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      
      ${report.damage_photos && report.damage_photos.length > 0 ? `
      <div class="section">
        <div class="section-title">Damage Photos</div>
        <div class="photos">
          ${report.damage_photos.map(photo => `
            <img src="${photo}" class="photo" alt="Damage Photo" />
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${report.assigned_tech ? `
      <div class="section">
        <div class="section-title">Assigned Technician</div>
        <div class="tech-bio">
          <div class="tech-name">${report.assigned_tech.full_name || 'Technician'}</div>
          <div class="tech-bio-text">${report.assigned_tech.bio || 'No bio available'}</div>
        </div>
      </div>
      ` : ''}
      
      ${report.total_parts_cost > 0 ? `
      <div class="section">
        <div class="section-title">Parts & Pricing</div>
        <div class="info-item">
          <div class="info-label">Total Parts Cost:</div>
          <div class="info-value">R ${report.total_parts_cost.toFixed(2)}</div>
        </div>
        ${report.final_eta_days ? `
        <div class="info-item">
          <div class="info-label">Estimated Delivery:</div>
          <div class="info-value">${report.final_eta_days} days</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      ${report.manager_notes ? `
      <div class="section">
        <div class="section-title">Manager Notes</div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0066cc;">
          ${report.manager_notes}
        </div>
      </div>
      ` : ''}
      
      <div class="footer">
        <div>Platinum Repairs - Professional Device Repair Services</div>
        <div>This report was generated automatically by the Platinum Repairs Management System</div>
      </div>
    </body>
    </html>
  `
}

// API endpoint helper function
export async function generatePDFBuffer(damageReportId: string): Promise<Buffer> {
  return await generateDamageReportPDF(damageReportId)
}
