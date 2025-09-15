'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PartsPricingModal from '@/components/PartsPricingModal'
import DashboardNavigation from '@/components/DashboardNavigation'

interface DamageReport {
  id: string
  dr_number: string
  claim_number: string
  device_brand: string
  device_model: string
  device_type: string
  imei_serial: string
  client_reported_issues: string[]
  tech_findings: string[]
  damage_photos: string[]
  final_parts_selected: string[]
  final_parts_details?: {
    selectedParts: any[]
    customParts: any[]
  }
  total_parts_cost: number
  final_total_cost: number
  excess_amount: number
  replacement_value: number
  tech_ber_suggestion: boolean
  manager_ber_decision: boolean | null
  ber_reason: string
  priority: number
  is_overdue: boolean
  is_warning: boolean
  status: string
  notes: string
  ai_checklist: string[]
  ai_risk_assessment: string
  assigned_tech_id: string
  assigned_tech_name?: string
  created_at: string
  updated_at: string
}

interface PartsPricing {
  part_number: string
  part_name: string
  device_brand: string
  device_model: string
  device_type: string
  insurance_price: number
  eta_info: string
  retail_1_year: number | null
  retail_2_year: number | null
  retail_lifetime: number | null
  replacement_value: number | null
  stock_status: string
  sheet_row_number: number
  last_synced: string
}

export default function ClaimManagerPage() {
  const [user, setUser] = useState<any>(null)
  const [damageReports, setDamageReports] = useState<DamageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)
  
  // Modal state
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showPartsModal, setShowPartsModal] = useState(false)
  
  // Parts and pricing state
  const [selectedParts, setSelectedParts] = useState<PartsPricing[]>([])
  const [customParts, setCustomParts] = useState<Array<{
    name: string
    price: number
    eta: number
    etaOption: string
  }>>([])
  
  // Manager decision state
  const [managerDecision, setManagerDecision] = useState<{
    berDecision: boolean | null
    berReason: string
    finalTotalCost: number
    excessAmount: number
    replacementValue: number
    managerNotes: string
  }>({
    berDecision: null,
    berReason: '',
    finalTotalCost: 0,
    excessAmount: 0,
    replacementValue: 0,
    managerNotes: ''
  })
  
  const router = useRouter()

  useEffect(() => {
    // Set a default admin user since we're already authenticated in the admin dashboard
    const defaultUser = {
      id: 'admin',
      username: 'admin',
      full_name: 'Admin User',
      role: 'admin',
      email: 'admin@platinumrepairs.com'
    }
    console.log('✅ Claim Manager: Setting default admin user')
    setUser(defaultUser)
  }, [])

  useEffect(() => {
    if (user) {
      fetchDamageReports()
      // Refresh every 30 seconds with Ajax (no page reload, no loading state)
      const interval = setInterval(() => {
        fetchDamageReportsSilently()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchDamageReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/damage-reports')
      if (!response.ok) {
        throw new Error('Failed to fetch damage reports')
      }
      const data = await response.json()
      
      // Fetch technician data separately
      const techResponse = await fetch('/api/technicians/work-data')
      let technicians: any[] = []
      if (techResponse.ok) {
        const techData = await techResponse.json()
        technicians = techData.technicians || []
      }
      
      // Map technician data to reports
      const reportsWithTech = data.reports.map((report: any) => {
        const tech = technicians.find(t => t.id === report.assigned_tech_id)
        return {
          ...report,
          assigned_tech_name: tech?.full_name || 'Unknown Technician'
        }
      })
      
      setDamageReports(reportsWithTech)
      setError(null)
    } catch (err) {
      console.error('Error fetching damage reports:', err)
      setError('Failed to load damage reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchDamageReportsSilently = async () => {
    try {
      const response = await fetch('/api/damage-reports')
      if (!response.ok) {
        throw new Error('Failed to fetch damage reports')
      }
      const data = await response.json()
      
      // Fetch technician data separately
      const techResponse = await fetch('/api/technicians/work-data')
      let technicians: any[] = []
      if (techResponse.ok) {
        const techData = await techResponse.json()
        technicians = techData.technicians || []
      }
      
      // Map technician data to reports
      const reportsWithTech = data.reports.map((report: any) => {
        const tech = technicians.find(t => t.id === report.assigned_tech_id)
        return {
          ...report,
          assigned_tech_name: tech?.full_name || 'Unknown Technician'
        }
      })
      
      setDamageReports(reportsWithTech)
    } catch (err) {
      console.error('Error silently fetching damage reports:', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const awaitingApproval = damageReports.filter(report => report.status === 'awaiting_approval')
  const inProgress = damageReports.filter(report => report.status === 'in_repair' || report.status === 'ber_confirmed')
  const completed = damageReports.filter(report => report.status === 'completed')

  const suggestPartsBasedOnAssessment = async (report: DamageReport) => {
    try {
      // Get available parts for this device - try multiple model variations
      let availableParts: any[] = []
      
      // Try exact model match first
      let response = await fetch(`/api/parts-pricing?brand=${encodeURIComponent(report.device_brand)}&model=${encodeURIComponent(report.device_model)}`)
      if (response.ok) {
        const data = await response.json()
        availableParts = data.parts || []
      }
      
      // If no parts found, try to find similar models
      if (availableParts.length === 0) {
        const brandResponse = await fetch(`/api/parts-pricing?action=models&brand=${encodeURIComponent(report.device_brand)}`)
        if (brandResponse.ok) {
          const brandData = await brandResponse.json()
          const models = brandData.models || []
          
          // Find models that contain the device model name
          const matchingModels = models.filter((model: string) => 
            model.toLowerCase().includes(report.device_model.toLowerCase()) ||
            report.device_model.toLowerCase().includes(model.toLowerCase())
          )
          
          // Try each matching model
          for (const model of matchingModels) {
            const modelResponse = await fetch(`/api/parts-pricing?brand=${encodeURIComponent(report.device_brand)}&model=${encodeURIComponent(model)}`)
            if (modelResponse.ok) {
              const modelData = await modelResponse.json()
              if (modelData.parts && modelData.parts.length > 0) {
                availableParts = modelData.parts
                console.log(`✅ Found parts for model variation: ${model}`)
                break
              }
            }
          }
        }
      }
      
      // First priority: Use technician's selected parts if available
      if (report.final_parts_selected && report.final_parts_selected.length > 0) {
        const technicianSelectedParts: PartsPricing[] = []
        
        for (const partName of report.final_parts_selected) {
          // Try to find exact match first
          let matchingPart = availableParts.find(part => 
            part.part_name.toLowerCase() === partName.toLowerCase()
          )
          
          // If no exact match, try partial match
          if (!matchingPart) {
            matchingPart = availableParts.find(part => 
              part.part_name.toLowerCase().includes(partName.toLowerCase()) ||
              partName.toLowerCase().includes(part.part_name.toLowerCase())
            )
          }
          
          if (matchingPart) {
            technicianSelectedParts.push(matchingPart)
          } else {
            console.log(`⚠️ Part "${partName}" not found in pricing sheet for ${report.device_brand} ${report.device_model}`)
          }
        }
        
        if (technicianSelectedParts.length > 0) {
          setSelectedParts(technicianSelectedParts)
          console.log('🔧 Technician selected parts:', technicianSelectedParts)
          return // Don't run AI suggestions if technician already selected parts
        }
      }
      
      // Fallback: AI-powered parts suggestion based on technician findings
      const suggestedParts: PartsPricing[] = []
      
      // Check technician findings for common repair scenarios
      const techFindings = report.tech_findings?.join(' ').toLowerCase() || ''
      const clientIssues = report.client_reported_issues?.join(' ').toLowerCase() || ''
      const allText = `${techFindings} ${clientIssues}`.toLowerCase()
      
      // Screen-related keywords
      if (allText.includes('screen') || allText.includes('display') || allText.includes('guard') || allText.includes('crack')) {
        const screenPart = availableParts.find(part => 
          part.part_name.toLowerCase().includes('screen') || 
          part.part_name.toLowerCase().includes('display')
        )
        if (screenPart) suggestedParts.push(screenPart)
      }
      
      // Battery-related keywords
      if (allText.includes('battery') || allText.includes('charging') || allText.includes('power')) {
        const batteryPart = availableParts.find(part => 
          part.part_name.toLowerCase().includes('battery')
        )
        if (batteryPart) suggestedParts.push(batteryPart)
      }
      
      // Casing/back cover keywords
      if (allText.includes('casing') || allText.includes('back') || allText.includes('cover') || allText.includes('housing')) {
        const casingPart = availableParts.find(part => 
          part.part_name.toLowerCase().includes('casing') || 
          part.part_name.toLowerCase().includes('back') ||
          part.part_name.toLowerCase().includes('cover')
        )
        if (casingPart) suggestedParts.push(casingPart)
      }
      
      // If we found suggested parts, set them
      if (suggestedParts.length > 0) {
        setSelectedParts(suggestedParts)
        console.log('🤖 AI suggested parts:', suggestedParts)
      }
      
    } catch (error) {
      console.error('Error suggesting parts:', error)
    }
  }

  const handleOpenModal = async (report: DamageReport) => {
    setSelectedReport(report)
    setManagerDecision({
      berDecision: report.manager_ber_decision,
      berReason: report.ber_reason || '',
      finalTotalCost: report.final_total_cost || 0,
      excessAmount: report.excess_amount || 0,
      replacementValue: report.replacement_value || 0,
      managerNotes: report.notes || ''
    })
    
    // Load saved parts data
    if (report.final_parts_details) {
      setSelectedParts(report.final_parts_details.selectedParts || [])
      setCustomParts(report.final_parts_details.customParts || [])
    } else if (report.final_parts_selected && report.final_parts_selected.length > 0) {
      // Fallback: reconstruct from basic data
      const savedParts: PartsPricing[] = report.final_parts_selected.map((partName: string, index: number) => ({
        part_number: `saved-${index}`,
        part_name: partName,
        device_brand: report.device_brand,
        device_model: report.device_model,
        device_type: report.device_type,
        insurance_price: 0,
        eta_info: 'Unknown',
        retail_1_year: null,
        retail_2_year: null,
        retail_lifetime: null,
        replacement_value: null,
        stock_status: 'unknown',
        sheet_row_number: 0,
        last_synced: new Date().toISOString()
      }))
      setSelectedParts(savedParts)
      setCustomParts([])
    } else {
      setSelectedParts([])
      setCustomParts([])
      
      // Suggest parts based on technician assessment
      await suggestPartsBasedOnAssessment(report)
      
      // Add default custom part for cleaning/maintenance if mentioned
      const techFindings = report.tech_findings?.join(' ').toLowerCase() || ''
      if (techFindings.includes('clean') || techFindings.includes('maintenance')) {
        setCustomParts([{
          name: 'Cleaning/Maintenance Service',
          price: 150, // R150 for cleaning service
          eta: 1,
          etaOption: '1-3 days'
        }])
      }
    }
    
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedReport(null)
    setSelectedParts([])
    setCustomParts([])
    setManagerDecision({
      berDecision: null,
      berReason: '',
      finalTotalCost: 0,
      excessAmount: 0,
      replacementValue: 0,
      managerNotes: ''
    })
  }

  const handleOpenPartsModal = () => {
    setShowPartsModal(true)
  }

  const handlePartsSelected = (parts: PartsPricing[]) => {
    console.log('Parts selected:', parts)
    setSelectedParts(parts)
    setShowPartsModal(false)
  }

  const calculateFinalETA = () => {
    const allParts = [...selectedParts, ...customParts.map(cp => ({ eta_info: `${cp.eta} days` }))]
    if (allParts.length === 0) return 0
    
    const etas = allParts.map(part => {
      const etaText = part.eta_info || '1 day'
      const match = etaText.match(/(\d+)/)
      return match ? parseInt(match[1]) : 1
    })
    
    return Math.max(...etas)
  }

  const calculateTotalCost = () => {
    const selectedPartsCost = selectedParts.reduce((sum, part) => sum + part.insurance_price, 0)
    const customPartsCost = customParts.reduce((sum, part) => sum + part.price, 0)
    return selectedPartsCost + customPartsCost
  }

  const calculateBERRatio = () => {
    const repairCostExclVAT = calculateTotalCost() // Already excluding VAT
    const replacementValueExclVAT = managerDecision.replacementValue / 1.15 // Remove 15% VAT
    if (replacementValueExclVAT === 0) return 0
    return (repairCostExclVAT / replacementValueExclVAT) * 100
  }

  const addCustomPart = () => {
    setCustomParts([...customParts, { name: '', price: 0, eta: 1, etaOption: '1-3 days' }])
  }

  const updateCustomPart = (index: number, field: string, value: string | number) => {
    const updated = [...customParts]
    updated[index] = { ...updated[index], [field]: value }
    setCustomParts(updated)
  }

  const removeCustomPart = (index: number) => {
    setCustomParts(customParts.filter((_, i) => i !== index))
  }

  const handleManagerDecision = async (reportId: string, decision: 'approve' | 'reject' | 'ber') => {
    try {
      const saveData = {
        decision,
        berDecision: decision === 'ber',
        berReason: managerDecision.berReason,
        finalTotalCost: calculateTotalCost(),
        managerNotes: managerDecision.managerNotes,
        selectedParts: selectedParts,
        customParts: customParts,
        finalETA: calculateFinalETA()
      }
      
      console.log('Saving manager decision with data:', saveData)
      console.log('Selected parts being saved:', selectedParts)
      
      const response = await fetch(`/api/damage-reports/${reportId}/manager-decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update manager decision')
      }

      // Refresh the reports list
      await fetchDamageReportsSilently()
      
      // Update the selected report status to show the new workflow
      if (selectedReport) {
        setSelectedReport({
          ...selectedReport,
          status: decision === 'ber' ? 'ber_confirmed' : 'in_repair'
        })
      }
    } catch (error) {
      console.error('Error updating manager decision:', error)
      alert('Failed to update manager decision')
    }
  }

  const handleRejectReport = async (reportId: string, reason: string) => {
    try {
      const response = await fetch(`/api/damage-reports/${reportId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      })
      
      if (!response.ok) {
        throw new Error('Failed to reject report')
      }

      await fetchDamageReportsSilently()
      handleCloseModal()
    } catch (error) {
      console.error('Error rejecting report:', error)
      alert('Failed to reject report')
    }
  }

  const handleMarkAsCompleted = async (reportId: string) => {
    try {
      console.log('Frontend: Attempting to complete report with ID:', reportId)
      
      const response = await fetch(`/api/damage-reports/${reportId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' })
      })
      
      console.log('Frontend: Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Frontend: Error response:', errorData)
        throw new Error(`Failed to mark report as completed: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log('Frontend: Success response:', result)

      await fetchDamageReportsSilently()
      handleCloseModal()
    } catch (error) {
      console.error('Error marking report as completed:', error)
      alert('Failed to mark report as completed')
    }
  }

  const handleGeneratePDF = async (reportId: string) => {
    try {
      setGeneratingPDF(reportId)
      const response = await fetch(`/api/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ damageReportId: reportId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const html = await response.text()
      
      // Open HTML in new window for printing
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        
        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        // Fallback: create a blob and download
        const blob = new Blob([html], { type: 'text/html' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `damage-report-${reportId}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setGeneratingPDF(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading damage reports...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDamageReports}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <DashboardNavigation currentSection="claim-manager" userRole={user?.role} />
      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claim Manager Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Manage damage reports and repair decisions</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {user?.full_name || user?.username}</span>
                <button 
                onClick={handleLogout}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Awaiting Approval</h3>
            <p className="text-3xl font-bold text-orange-600">{awaitingApproval.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">In Progress</h3>
            <p className="text-3xl font-bold text-blue-600">{inProgress.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{completed.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Reports</h3>
            <p className="text-3xl font-bold text-gray-600">{damageReports.length}</p>
          </div>
        </div>

        {/* Awaiting Approval - Card Layout */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Damage Reports Awaiting Approval</h2>
          {awaitingApproval.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">No damage reports awaiting approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {awaitingApproval.map((report) => (
                <div 
                  key={report.id} 
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenModal(report)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{report.device_brand} {report.device_model}</h3>
                      <p className="text-xs text-gray-600">DR: {report.dr_number}</p>
                      <p className="text-xs text-gray-600">Claim: {report.claim_number}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full">
                      Pending
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{report.device_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Photos:</span>
                      <span>{report.damage_photos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Priority:</span>
                      <span>{report.priority}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        report.tech_ber_suggestion 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {report.tech_ber_suggestion ? 'BER' : 'Repairable'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Click to review and make decision</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* In Progress Reports - Card Layout */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Reports In Progress</h2>
          {inProgress.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">No reports in progress.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgress.map((report) => (
                <div 
                  key={report.id} 
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenModal(report)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{report.device_brand} {report.device_model}</h3>
                      <p className="text-xs text-gray-600">DR: {report.dr_number}</p>
                      <p className="text-xs text-gray-600">Claim: {report.claim_number}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      report.status === 'in_repair' 
                        ? 'text-blue-800 bg-blue-100' 
                        : 'text-red-800 bg-red-100'
                    }`}>
                      {report.status === 'in_repair' ? 'In Repair' : 'BER Confirmed'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{report.device_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost:</span>
                      <span>R{report.final_total_cost || report.total_parts_cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Decision:</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        report.manager_ber_decision 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {report.manager_ber_decision ? 'BER' : 'Repair'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Click to view details</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Reports - Card Layout */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Reports</h2>
          {completed.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">No completed reports yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completed.map((report) => (
                <div 
                  key={report.id} 
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenModal(report)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{report.device_brand} {report.device_model}</h3>
                      <p className="text-xs text-gray-600">DR: {report.dr_number}</p>
                      <p className="text-xs text-gray-600">Claim: {report.claim_number}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      report.status === 'completed' 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-blue-800 bg-blue-100'
                    }`}>
                      {report.status === 'completed' ? 'Completed' : 'In Repair'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{report.device_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost:</span>
                      <span>R{report.final_total_cost || report.total_parts_cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Decision:</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        report.manager_ber_decision 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {report.manager_ber_decision ? 'BER' : 'Repair'}
                      </span>
        </div>
      </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">Click to view details</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for detailed work */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedReport.device_brand} {selectedReport.device_model}</h2>
                  <p className="text-sm text-gray-600">DR: {selectedReport.dr_number} | Claim: {selectedReport.claim_number}</p>
                  {selectedReport.assigned_tech_name && (
                    <p className="text-sm text-blue-600 font-medium">Technician: {selectedReport.assigned_tech_name}</p>
                  )}
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 3-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column 1: Device Info & Assessment */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Device Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Model:</span> {selectedReport.device_brand} {selectedReport.device_model}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {selectedReport.device_type}
                      </div>
                      {selectedReport.imei_serial && (
                        <div>
                          <span className="font-medium">IMEI:</span> {selectedReport.imei_serial}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Photos:</span> {selectedReport.damage_photos.length} uploaded
                      </div>
                      <div>
                        <span className="font-medium">Priority:</span> {selectedReport.priority}/5
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Technician Assessment</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          selectedReport.tech_ber_suggestion 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {selectedReport.tech_ber_suggestion ? 'BER Suggested' : 'Repairable'}
                        </span>
                      </div>
                      {selectedReport.ber_reason && (
                        <div>
                          <span className="font-medium">Reason:</span> {selectedReport.ber_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Technician Photos */}
                  {selectedReport.damage_photos && selectedReport.damage_photos.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Technician Photos</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedReport.damage_photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={photo}
                              alt={`Damage photo ${index + 1}`}
                              className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(photo, '_blank')}
                            />
                            <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Click to view full size</p>
                    </div>
                  )}

                  {/* AI Analysis Section */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      🤖 AI Analysis
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-blue-800">Device Assessment</div>
                        <div className="text-sm text-blue-700">
                          {selectedReport.ai_risk_assessment || 'AI analysis not available for this report.'}
                        </div>
                      </div>
                      {selectedReport.ai_checklist && selectedReport.ai_checklist.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-blue-800">Key Issues Identified</div>
                          <ul className="text-sm text-blue-700 space-y-1">
                            {selectedReport.ai_checklist.map((item, index) => (
                              <li key={index}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Relevant Ticket Comments Section */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-3 flex items-center">
                      📝 Ticket History & Comments
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-green-800">Client Reported Issues</div>
                        <div className="text-sm text-green-700">
                          {selectedReport.client_reported_issues && selectedReport.client_reported_issues.length > 0 ? (
                            <ul className="space-y-1">
                              {selectedReport.client_reported_issues.map((issue, index) => (
                                <li key={index}>• {issue}</li>
                              ))}
                            </ul>
                          ) : (
                            'No client issues recorded'
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-800">Technician Findings</div>
                        <div className="text-sm text-green-700">
                          {selectedReport.tech_findings && selectedReport.tech_findings.length > 0 ? (
                            <ul className="space-y-1">
                              {selectedReport.tech_findings.map((finding, index) => (
                                <li key={index}>• {finding}</li>
                              ))}
                            </ul>
                          ) : (
                            'No technician findings recorded'
                          )}
                        </div>
                      </div>
                      {selectedReport.notes && (
                        <div>
                          <div className="text-sm font-medium text-green-800">Additional Notes</div>
                          <div className="text-sm text-green-700">{selectedReport.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Column 2: Combined Issues & Parts */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Combined Issues & Findings */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Issues & Assessment</h4>
                    
                    {/* AI Checklist */}
                    {selectedReport.ai_checklist && selectedReport.ai_checklist.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-blue-900 mb-2 flex items-center text-sm">
                          🤖 AI Checklist
                        </h5>
                        <div className="space-y-2">
                          {selectedReport.ai_checklist.map((item, index) => {
                            const clientIssue = selectedReport.client_reported_issues?.[index]
                            const techFinding = selectedReport.tech_findings?.[index]
                            
                            return (
                              <div key={index} className="bg-white p-3 rounded border">
                                <div className="text-sm font-medium text-gray-900 mb-2">{item}</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="font-medium text-green-700">Client:</span>
                                    <div className="text-green-600">{clientIssue || 'Not reported'}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium text-yellow-700">Technician:</span>
                                    <div className="text-yellow-600">{techFinding || 'Not assessed'}</div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Additional Client Issues (if more than AI checklist) */}
                    {selectedReport.client_reported_issues && selectedReport.client_reported_issues.length > (selectedReport.ai_checklist?.length || 0) && (
                      <div className="mb-4">
                        <h5 className="font-medium text-green-900 mb-2 text-sm">Additional Client Issues</h5>
                        <ul className="text-sm text-green-800 space-y-1">
                          {selectedReport.client_reported_issues.slice(selectedReport.ai_checklist?.length || 0).map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Additional Technician Findings (if more than AI checklist) */}
                    {selectedReport.tech_findings && selectedReport.tech_findings.length > (selectedReport.ai_checklist?.length || 0) && (
                      <div className="mb-4">
                        <h5 className="font-medium text-yellow-900 mb-2 text-sm">Additional Technician Findings</h5>
                        <ul className="text-sm text-yellow-800 space-y-1">
                          {selectedReport.tech_findings.slice(selectedReport.ai_checklist?.length || 0).map((finding, index) => (
                            <li key={index}>• {finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Parts Selection */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-blue-900">Parts & Pricing</h4>
                      <button
                        onClick={handleOpenPartsModal}
                        className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Select Parts
                      </button>
                    </div>
                    
                    {/* Selected Parts from Pricing Sheet */}
                    {selectedParts.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-blue-800 mb-2">From Pricing Sheet</h5>
                        <div className="space-y-1">
                          {selectedParts.map((part, index) => (
                            <div key={index} className="text-sm text-blue-700 flex justify-between">
                              <span>{part.part_name}</span>
                              <span>R{part.insurance_price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Parts */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-blue-800">Custom Parts</h5>
                        <button
                          onClick={addCustomPart}
                          className="text-blue-600 text-sm hover:text-blue-800"
                        >
                          + Add Custom Part
                        </button>
                      </div>
                      <div className="space-y-2">
                        {customParts.map((part, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Part name"
                                value={part.name}
                                onChange={(e) => updateCustomPart(index, 'name', e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                              <button
                                onClick={() => removeCustomPart(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                ×
                              </button>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-600 mb-1">Price excl. VAT</label>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={part.price}
                                  onChange={(e) => updateCustomPart(index, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-gray-600 mb-1">ETA</label>
                                <select
                                  value={part.etaOption}
                                  onChange={(e) => {
                                    const etaOption = e.target.value
                                    let etaDays = 1
                                    if (etaOption === 'No Parts Required') etaDays = 0
                                    else if (etaOption === 'Parts Are In Stock') etaDays = 1
                                    else if (etaOption === '1-3 days') etaDays = 2
                                    else if (etaOption === '3-5 days') etaDays = 4
                                    else if (etaOption === '5-7 days') etaDays = 6
                                    else if (etaOption === '1-2 weeks') etaDays = 10
                                    else if (etaOption === '2-3 weeks') etaDays = 17
                                    else if (etaOption === '3-4 weeks') etaDays = 24
                                    else if (etaOption === '4+ weeks') etaDays = 30
                                    
                                    updateCustomPart(index, 'etaOption', etaOption)
                                    updateCustomPart(index, 'eta', etaDays)
                                  }}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                >
                                  <option value="No Parts Required">No Parts Required</option>
                                  <option value="Parts Are In Stock">Parts Are In Stock</option>
                                  <option value="1-3 days">1-3 days</option>
                                  <option value="3-5 days">3-5 days</option>
                                  <option value="5-7 days">5-7 days</option>
                                  <option value="1-2 weeks">1-2 weeks</option>
                                  <option value="2-3 weeks">2-3 weeks</option>
                                  <option value="3-4 weeks">3-4 weeks</option>
                                  <option value="4+ weeks">4+ weeks</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cost Summary */}
                    <div className="border-t pt-2">
                      <div className="text-sm text-blue-800 space-y-1">
                        <div className="flex justify-between">
                          <span>Parts Cost:</span>
                          <span>R{calculateTotalCost()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Final ETA:</span>
                          <span>{(() => {
                            const allParts = [...selectedParts, ...customParts.map(cp => ({ eta_info: cp.etaOption }))]
                            if (allParts.length === 0) return 'Not specified'
                            
                            const etas = allParts.map(part => {
                              const etaText = part.eta_info || '1-3 days'
                              return etaText
                            })
                            
                            // Return the longest ETA option
                            const etaOptions = ['No Parts Required', 'Parts Are In Stock', '1-3 days', '3-5 days', '5-7 days', '1-2 weeks', '2-3 weeks', '3-4 weeks', '4+ weeks']
                            let longestIndex = 0
                            etas.forEach(eta => {
                              const index = etaOptions.indexOf(eta)
                              if (index > longestIndex) longestIndex = index
                            })
                            
                            return etaOptions[longestIndex]
                          })()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BER Ratio Analysis */}
                  {calculateTotalCost() > 0 && managerDecision.replacementValue > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">BER Ratio Analysis</h4>
                      <div className="text-sm text-yellow-800 space-y-1">
                        <div>Repair Cost (excl. VAT): R{calculateTotalCost().toFixed(2)}</div>
                        <div>Replacement Value (incl. VAT): R{managerDecision.replacementValue.toFixed(2)}</div>
                        <div>Replacement Value (excl. VAT): R{(managerDecision.replacementValue / 1.15).toFixed(2)}</div>
                        <div className="font-medium">
                          BER Ratio: {calculateBERRatio().toFixed(1)}%
                          {calculateBERRatio() > 70 && (
                            <span className="text-red-600 ml-1">(High BER Risk)</span>
                          )}
                        </div>
                        <div className="text-xs text-yellow-700 mt-2">
                          {calculateBERRatio() > 70 ? 'Beyond Economical Repair' : 'Economically Repairable'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 3: Manager Decision */}
                <div className="lg:col-span-4 space-y-4">

                  {/* Replacement Value Input */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Replacement Value</h4>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Replacement Value (R)</label>
                      <input
                        type="number"
                        value={managerDecision.replacementValue}
                        onChange={(e) => setManagerDecision(prev => ({ 
                          ...prev, 
                          replacementValue: parseFloat(e.target.value) || 0 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter replacement value"
                      />
                      <p className="text-xs text-gray-500">Leave empty if no replacement value available</p>
                    </div>
                  </div>

                  {/* Manager Decision */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Manager Decision</h4>
                    
                    {/* Manager Notes */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manager Notes</label>
                      <textarea
                        value={managerDecision.managerNotes}
                        onChange={(e) => setManagerDecision(prev => ({ ...prev, managerNotes: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Add manager notes..."
                      />
                    </div>

                    {/* BER Decision */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">BER Decision</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`ber-${selectedReport.id}`}
                            value="repair"
                            checked={managerDecision.berDecision === false}
                            onChange={() => setManagerDecision(prev => ({ ...prev, berDecision: false }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-green-700">Repairable</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`ber-${selectedReport.id}`}
                            value="ber"
                            checked={managerDecision.berDecision === true}
                            onChange={() => setManagerDecision(prev => ({ ...prev, berDecision: true }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-red-700">Beyond Economical Repair</span>
                        </label>
                      </div>
                    </div>

                    {/* BER Reason */}
                    {managerDecision.berDecision === true && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">BER Reason</label>
                        <select
                          value={managerDecision.berReason}
                          onChange={(e) => setManagerDecision(prev => ({ ...prev, berReason: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select BER reason...</option>
                          <option value="Beyond Economical Repair">Beyond Economical Repair</option>
                          <option value="Liquid">Liquid</option>
                          <option value="Mainboard">Mainboard</option>
                          <option value="Power Surge">Power Surge</option>
                          <option value="Stock unavailability">Stock unavailability</option>
                          <option value="Due to the extent of impact damage">Due to the extent of impact damage</option>
                          <option value="The waterproof seal cannot be sealed to its original factory state when these parts are replaced">The waterproof seal cannot be sealed to its original factory state when these parts are replaced</option>
                        </select>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {selectedReport.status === 'awaiting_approval' ? (
                        <button
                          onClick={() => {
                            const decision = managerDecision.berDecision ? 'ber' : 'approve'
                            handleManagerDecision(selectedReport.id, decision)
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                          Save Decision
                        </button>
                      ) : selectedReport.status === 'in_repair' || selectedReport.status === 'ber_confirmed' ? (
                        <>
                          <button
                            onClick={() => handleGeneratePDF(selectedReport.id)}
                            disabled={generatingPDF === selectedReport.id}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            {generatingPDF === selectedReport.id ? 'Generating...' : 'Generate PDF'}
                          </button>
                          <button
                            onClick={() => handleMarkAsCompleted(selectedReport.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm"
                          >
                            Complete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleMarkAsCompleted(selectedReport.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm"
                        >
                          Mark as Completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parts Pricing Modal */}
      <PartsPricingModal
        isOpen={showPartsModal}
        onClose={() => setShowPartsModal(false)}
        onSelectParts={handlePartsSelected}
        selectedParts={selectedParts}
        deviceBrand={selectedReport?.device_brand}
        deviceModel={selectedReport?.device_model}
      />
    </div>
  )
}