import { supabaseAdmin } from '@/lib/supabase'

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
  final_parts_selected?: string[]
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
  client_name?: string
  ticket_number?: string
  created_at: string
  updated_at: string
}

export async function generateDamageReportPDF(damageReportId: string): Promise<string> {
  try {
    console.log('PDF Generator: Starting for damage report ID:', damageReportId)
    
    // Fetch the damage report with technician details
    const { data: report, error } = await supabaseAdmin
      .from('damage_reports')
      .select(`
        *,
        assigned_tech:users!assigned_tech_id(full_name, bio)
      `)
      .eq('id', damageReportId)
      .single()

    if (error) {
      console.error('PDF Generator: Error fetching report:', error)
      throw new Error(`Failed to fetch damage report: ${error.message}`)
    }

    if (!report) {
      console.error('PDF Generator: No report found for ID:', damageReportId)
      throw new Error('Damage report not found')
    }

    console.log('PDF Generator: Report found, generating HTML...')
    console.log('PDF Generator: Report data:', {
      id: report.id,
      dr_number: report.dr_number,
      device_brand: report.device_brand,
      device_model: report.device_model,
      status: report.status,
      final_parts_selected: report.final_parts_selected,
      total_parts_cost: report.total_parts_cost,
      assigned_tech: report.assigned_tech
    })

    // Generate HTML for the PDF
    const html = generatePDFHTML(report)
    console.log('PDF Generator: HTML generated, length:', html.length)
    
    return html
  } catch (error) {
    console.error('PDF Generator: Error:', error)
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
      <meta charset="utf-8">
      <title>Damage Report - ${report.dr_number}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: white;
          color: #333;
          line-height: 1.6;
          font-size: 12px;
        }
        .header { 
          text-align: center; 
          margin-bottom: 20px; 
          padding-bottom: 15px; 
          border-bottom: 3px solid #0066cc;
        }
        .report-title { 
          font-size: 24px; 
          font-weight: bold; 
          color: #0066cc; 
          margin-bottom: 8px;
        }
        .report-number { 
          font-size: 16px; 
          color: #333; 
          font-weight: 600;
        }
        .two-column { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin-bottom: 20px;
        }
        .section { 
          margin-bottom: 15px; 
          page-break-inside: avoid;
        }
        .section-title { 
          font-size: 14px; 
          font-weight: bold; 
          color: #0066cc; 
          margin-bottom: 8px; 
          padding-bottom: 3px; 
          border-bottom: 1px solid #e0e0e0;
        }
        .info-item { 
          margin-bottom: 6px; 
          display: flex; 
          justify-content: space-between;
          font-size: 11px;
        }
        .info-label { 
          font-weight: 600; 
          color: #555;
          min-width: 120px;
        }
        .info-value {
          text-align: right;
          flex: 1;
        }
        .photos { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 10px; 
          margin-top: 10px;
          page-break-before: always;
        }
        .photo { 
          max-width: 100%; 
          height: 200px; 
          object-fit: cover;
          border: 2px solid #ddd;
          border-radius: 6px;
          page-break-inside: avoid;
        }
        .tech-bio { 
          background: #f8f9fa; 
          padding: 12px; 
          border-radius: 6px;
          border-left: 3px solid #0066cc;
          font-size: 11px;
        }
        .tech-name { 
          font-weight: bold; 
          color: #0066cc; 
          margin-bottom: 6px;
        }
        .tech-bio-text { 
          color: #666; 
          line-height: 1.4;
        }
        .findings-list { 
          margin: 6px 0; 
          padding-left: 15px;
          font-size: 11px;
        }
        .findings-list li { 
          margin-bottom: 3px; 
          color: #555;
        }
        .classification {
          background: ${report.manager_ber_decision ? '#ffebee' : '#e8f5e8'};
          padding: 10px;
          border-radius: 6px;
          border-left: 3px solid ${report.manager_ber_decision ? '#f44336' : '#4caf50'};
          font-size: 11px;
        }
        .classification-title {
          font-weight: bold;
          color: ${report.manager_ber_decision ? '#d32f2f' : '#2e7d32'};
          margin-bottom: 3px;
        }
        .parts-list {
          margin: 5px 0; 
          padding-left: 15px;
          font-size: 11px;
        }
        .parts-list li { 
          margin-bottom: 2px; 
          color: #555;
        }
        .full-width {
          grid-column: 1 / -1;
        }
        @media print {
          body { margin: 0; padding: 10px; }
          .section { page-break-inside: avoid; }
          .two-column { gap: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="report-title">Platinum Repairs</div>
        <div class="report-number">Damage Report: ${report.dr_number || 'DR-' + report.id.substring(0, 8).toUpperCase()}</div>
        <div style="color: #666; margin-top: 8px; font-size: 12px;">Generated on: ${currentDate}</div>
      </div>

      <!-- Two Column Layout for Main Content -->
      <div class="two-column">
        <!-- Left Column -->
        <div>
          <div class="section">
            <div class="section-title">Claim Information</div>
            ${report.claim_number ? `
            <div class="info-item">
              <div class="info-label">Claim Number:</div>
              <div class="info-value">${report.claim_number}</div>
            </div>
            ` : ''}
            ${report.ticket_number ? `
            <div class="info-item">
              <div class="info-label">Ticket Number:</div>
              <div class="info-value">${report.ticket_number}</div>
            </div>
            ` : ''}
            ${report.client_name ? `
            <div class="info-item">
              <div class="info-label">Client Name:</div>
              <div class="info-value">${report.client_name}</div>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">Device Information</div>
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

          <div class="section">
            <div class="section-title">Assessment</div>
            <div class="classification">
              <div class="classification-title">
                ${report.manager_ber_decision ? 'Beyond Economical Repair (BER)' : 'Repairable'}
              </div>
              ${report.ber_reason ? `<div style="margin-top: 5px;">Reason: ${report.ber_reason}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <div class="section">
            <div class="section-title">Technician Information</div>
            ${report.assigned_tech ? `
            <div class="tech-bio">
              <div class="tech-name">${report.assigned_tech.full_name}</div>
              <div class="tech-bio-text">${report.assigned_tech.bio || 'Technician details not available'}</div>
            </div>
            ` : report.assigned_tech_id ? `
            <div class="tech-bio">
              <div class="tech-name">Technician ID: ${report.assigned_tech_id}</div>
              <div class="tech-bio-text">Technician details not available</div>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">Parts & Pricing</div>
            ${report.final_parts_selected && report.final_parts_selected.length > 0 ? `
            <div class="info-item">
              <div class="info-label">Parts Needed:</div>
              <div class="info-value">
                <ul class="parts-list">
                  ${report.final_parts_selected.map((part: string) => `<li>${part}</li>`).join('')}
                </ul>
              </div>
            </div>
            ` : ''}
            <div class="info-item">
              <div class="info-label">Parts Cost (excl. VAT):</div>
              <div class="info-value">R ${(report.total_parts_cost || 0).toFixed(2)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Parts Cost (incl. VAT):</div>
              <div class="info-value">R ${((report.total_parts_cost || 0) * 1.15).toFixed(2)}</div>
            </div>
            ${report.final_eta_days ? `
            <div class="info-item">
              <div class="info-label">ETA for Parts:</div>
              <div class="info-value">${report.final_eta_days} days</div>
            </div>
            ` : ''}
          </div>

          ${report.manager_notes ? `
          <div class="section">
            <div class="section-title">Manager Notes</div>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 3px solid #0066cc; font-size: 11px;">
              ${report.manager_notes}
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Full Width Sections -->
      <div class="section full-width">
        <div class="section-title">Issues & Findings</div>
        ${report.tech_findings && report.tech_findings.length > 0 ? `
        <div style="margin-bottom: 10px;">
          <div style="font-weight: 600; color: #0066cc; margin-bottom: 5px;">Technician Findings:</div>
          <ul class="findings-list">
            ${report.tech_findings.map(finding => `<li>${finding}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${report.client_reported_issues && report.client_reported_issues.length > 0 ? `
        <div>
          <div style="font-weight: 600; color: #0066cc; margin-bottom: 5px;">Client Reported Issues:</div>
          <ul class="findings-list">
            ${report.client_reported_issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      
      ${report.damage_photos && report.damage_photos.length > 0 ? `
      <div class="section full-width" style="page-break-before: always;">
        <div class="section-title">Damage Photos</div>
        <div class="photos">
          ${report.damage_photos.map((photo, index) => `
            <div style="text-align: center; margin-bottom: 8px;">
              <img src="${photo}" class="photo" alt="Damage Photo ${index + 1}" />
              <div style="margin-top: 3px; font-size: 10px; color: #666;">Damage Photo ${index + 1}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </body>
    </html>
  `
}

// API endpoint helper function
export async function generatePDFBuffer(damageReportId: string): Promise<string> {
  return await generateDamageReportPDF(damageReportId)
}
