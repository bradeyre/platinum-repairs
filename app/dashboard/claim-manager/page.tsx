'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PartsPricingModal from '@/components/PartsPricingModal'

interface DamageReport {
  id: string
  dr_number: string
  claim_number: string
  device_brand: string
  device_model: string
  device_type: string
  imei_serial?: string
  client_reported_issues: string[]
  tech_findings: string[]
  damage_photos: string[]
  final_parts_selected: string[]
  total_parts_cost: number
  final_total_cost: number
  excess_amount: number
  replacement_value: number
  status: 'pending' | 'assigned' | 'in_assessment' | 'awaiting_approval' | 'in_repair' | 'quality_check' | 'completed' | 'ber_confirmed' | 'cancelled'
  notes?: string
  ai_checklist: string[]
  ai_risk_assessment?: string
  tech_ber_suggestion?: boolean
  manager_ber_decision?: boolean
  ber_reason?: string
  priority: number
  is_overdue: boolean
  is_warning: boolean
  assigned_tech_id?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'technician' | 'claim_manager'
  full_name?: string
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

export default function ClaimManagerDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [damageReports, setDamageReports] = useState<DamageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null)
  const [showPartsModal, setShowPartsModal] = useState(false)
  const [selectedParts, setSelectedParts] = useState<PartsPricing[]>([])
  const [customParts, setCustomParts] = useState<Array<{
    name: string
    price: number
    eta: number
  }>>([])
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
      id: '1',
      email: 'brad@platinumrepairs.com',
      username: 'brad',
      role: 'admin' as const,
      full_name: 'Brad'
    }
    console.log('✅ Claim Manager: Setting default admin user')
    setUser(defaultUser)
  }, [])

  useEffect(() => {
    if (user) {
      fetchDamageReports()
      // Refresh every 30 seconds with Ajax (no page reload)
      const interval = setInterval(() => {
        fetchDamageReports()
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
      setDamageReports(data.reports)
      setError(null)
    } catch (err) {
      console.error('Error fetching damage reports:', err)
      setError('Failed to load damage reports')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/damage-reports/${reportId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to approve report')
      }
      
      // Update local state
      setDamageReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: 'completed' as const }
          : report
      ))
    } catch (err) {
      console.error('Error approving report:', err)
      alert('Failed to approve report')
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
      
      // Update local state
      setDamageReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: 'in_repair' as const }
          : report
      ))
    } catch (err) {
      console.error('Error rejecting report:', err)
      alert('Failed to reject report')
    }
  }

  const handleGeneratePDF = async (reportId: string) => {
    try {
      setGeneratingPDF(reportId)
      
      const response = await fetch(`/api/pdf/generate?id=${reportId}`)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }
      
      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `damage-report-${reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Failed to generate PDF')
    } finally {
      setGeneratingPDF(null)
    }
  }

  const handleOpenPartsModal = (report: DamageReport) => {
    setSelectedReport(report)
    setShowPartsModal(true)
  }

  const handlePartsSelected = (parts: PartsPricing[]) => {
    setSelectedParts(parts)
    const totalCost = parts.reduce((sum, part) => sum + part.insurance_price, 0)
    const replacementValue = parts[0]?.replacement_value || 0
    
    setManagerDecision(prev => ({
      ...prev,
      finalTotalCost: totalCost,
      replacementValue: replacementValue
    }))
  }

  const calculateBERRatio = () => {
    if (managerDecision.finalTotalCost === 0 || managerDecision.replacementValue === 0) {
      return 0
    }
    return (managerDecision.finalTotalCost / managerDecision.replacementValue) * 100
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

  const addCustomPart = () => {
    setCustomParts([...customParts, { name: '', price: 0, eta: 1 }])
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
      const response = await fetch(`/api/damage-reports/${reportId}/manager-decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          berDecision: decision === 'ber',
          berReason: managerDecision.berReason,
          finalTotalCost: calculateTotalCost(),
          excessAmount: managerDecision.excessAmount,
          replacementValue: managerDecision.replacementValue,
          managerNotes: managerDecision.managerNotes,
          selectedParts: selectedParts,
          customParts: customParts,
          finalETA: calculateFinalETA()
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update manager decision')
      }
      
      // Refresh damage reports
      fetchDamageReports()
      setSelectedReport(null)
      setShowPartsModal(false)
      setSelectedParts([])
      setManagerDecision({
        berDecision: null,
        berReason: '',
        finalTotalCost: 0,
        excessAmount: 0,
        replacementValue: 0,
        managerNotes: ''
      })
    } catch (err) {
      console.error('Error updating manager decision:', err)
      alert('Failed to update manager decision')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
    console.log('🔄 Claim Manager: No user, showing loading screen')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading damage reports...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
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

  const awaitingApproval = damageReports.filter(r => r.status === 'awaiting_approval')
  const completed = damageReports.filter(r => r.status === 'completed')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Platinum Repairs - Claim Manager Dashboard</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Switch to:</span>
                <select 
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                  onChange={(e) => {
                    if (e.target.value === 'admin') {
                      window.location.href = '/dashboard/admin'
                    } else if (e.target.value === 'technician') {
                      window.location.href = '/dashboard/technician'
                    } else if (e.target.value === 'claim-manager') {
                      window.location.href = '/dashboard/claim-manager'
                    }
                  }}
                  value="claim-manager"
                >
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                  <option value="claim-manager">Claim Manager</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-600">Welcome, {user.full_name || user.username}</span>
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Awaiting Approval</h3>
            <p className="text-3xl font-bold text-orange-600">{awaitingApproval.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Completed Today</h3>
            <p className="text-3xl font-bold text-green-600">{completed.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Reports</h3>
            <p className="text-3xl font-bold text-blue-600">{damageReports.length}</p>
          </div>
        </div>

        {/* Awaiting Approval */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Damage Reports Awaiting Approval</h2>
          {awaitingApproval.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">No damage reports awaiting approval.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {awaitingApproval.map((report) => (
                <div key={report.id} className="bg-white p-6 rounded-lg shadow">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{report.device_brand} {report.device_model}</h3>
                      <p className="text-sm text-gray-600">DR: {report.dr_number} | Claim: {report.claim_number}</p>
                    </div>
                    <span className="px-3 py-1 text-sm font-medium text-orange-800 bg-orange-100 rounded-full">
                      Awaiting Approval
                    </span>
                  </div>

                  {/* 3-Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Column 1: Device Info & Assessment */}
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Device Information</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Model:</span> {report.device_brand} {report.device_model}
                          </div>
                          <div>
                            <span className="font-medium">Type:</span> {report.device_type}
                          </div>
                          {report.imei_serial && (
                            <div>
                              <span className="font-medium">IMEI:</span> {report.imei_serial}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Photos:</span> {report.damage_photos.length} uploaded
                          </div>
                          <div>
                            <span className="font-medium">Priority:</span> {report.priority}/5
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Technician Assessment</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Status:</span> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              report.tech_ber_suggestion 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {report.tech_ber_suggestion ? 'BER Suggested' : 'Repairable'}
                            </span>
                          </div>
                          {report.ber_reason && (
                            <div>
                              <span className="font-medium">Reason:</span> {report.ber_reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Checklist */}
                      {report.ai_checklist && report.ai_checklist.length > 0 && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                            🤖 AI Checklist
                          </h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {report.ai_checklist.map((item, index) => (
                              <li key={index}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Issues & Findings */}
                    <div className="space-y-4">
                      {/* Client Reported Issues */}
                      {report.client_reported_issues && report.client_reported_issues.length > 0 && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-2 flex items-center">
                            ✅ Client Reported Issues
                          </h4>
                          <ul className="text-sm text-green-800 space-y-1">
                            {report.client_reported_issues.map((issue, index) => (
                              <li key={index}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Technician Findings */}
                      {report.tech_findings && report.tech_findings.length > 0 && (
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                            🔧 Technician Findings
                          </h4>
                          <ul className="text-sm text-yellow-800 space-y-1">
                            {report.tech_findings.map((finding, index) => (
                              <li key={index}>• {finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* BER Ratio Analysis */}
                      {report.final_total_cost > 0 && report.replacement_value > 0 && (
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <h4 className="font-medium text-yellow-900 mb-2">BER Ratio Analysis</h4>
                          <div className="text-sm text-yellow-800 space-y-1">
                            <div>Repair Cost: R{report.final_total_cost}</div>
                            <div>Replacement Value: R{report.replacement_value}</div>
                            <div className="font-medium">
                              BER Ratio: {((report.final_total_cost / report.replacement_value) * 100).toFixed(1)}%
                              {((report.final_total_cost / report.replacement_value) * 100) > 70 && (
                                <span className="text-red-600 ml-1">(High BER Risk)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 3: Parts & Manager Decision */}
                    <div className="space-y-4">
                      {/* Parts Selection */}
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-blue-900">Parts & Pricing</h4>
                          <button
                            onClick={() => handleOpenPartsModal(report)}
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
                              <div key={index} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Part name"
                                  value={part.name}
                                  onChange={(e) => updateCustomPart(index, 'name', e.target.value)}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <input
                                  type="number"
                                  placeholder="Price"
                                  value={part.price}
                                  onChange={(e) => updateCustomPart(index, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <input
                                  type="number"
                                  placeholder="ETA"
                                  value={part.eta}
                                  onChange={(e) => updateCustomPart(index, 'eta', parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                                <button
                                  onClick={() => removeCustomPart(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  ×
                                </button>
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
                              <span>{calculateFinalETA()} days</span>
                            </div>
                            {report.replacement_value > 0 && (
                              <div className="flex justify-between">
                                <span>Replacement Value:</span>
                                <span>R{report.replacement_value}</span>
                              </div>
                            )}
                          </div>
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
                                name={`ber-${report.id}`}
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
                                name={`ber-${report.id}`}
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
                            <input
                              type="text"
                              value={managerDecision.berReason}
                              onChange={(e) => setManagerDecision(prev => ({ ...prev, berReason: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Reason for BER decision..."
                            />
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleManagerDecision(report.id, 'approve')}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm"
                          >
                            Approve Repair
                          </button>
                          <button
                            onClick={() => handleManagerDecision(report.id, 'ber')}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
                          >
                            Mark as BER
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for rejection:')
                              if (reason) handleRejectReport(report.id, reason)
                            }}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors text-sm"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleGeneratePDF(report.id)}
                            disabled={generatingPDF === report.id}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            {generatingPDF === report.id ? 'Generating...' : 'Generate PDF'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Reports */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Completed Reports</h2>
          {completed.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">No completed reports yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completed.slice(0, 5).map((report) => (
                <div key={report.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{report.device_brand} {report.device_model}</h3>
                    <span className="px-3 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
                      Completed
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Repair Estimate: R{report.final_total_cost || report.total_parts_cost}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Completed: {new Date(report.completed_at || report.updated_at).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleGeneratePDF(report.id)}
                    disabled={generatingPDF === report.id}
                    className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {generatingPDF === report.id ? 'Generating...' : 'Generate PDF'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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