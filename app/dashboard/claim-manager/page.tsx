'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

export default function ClaimManagerDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [damageReports, setDamageReports] = useState<DamageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      // Check localStorage for user data
      const userData = localStorage.getItem('user')
      if (!userData) {
        router.push('/login')
        return
      }
      
      try {
        const parsedUser = JSON.parse(userData)
        if (parsedUser.role !== 'claim_manager' && parsedUser.role !== 'admin') {
          router.push('/login')
          return
        }
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing user data:', error)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchDamageReports()
      // Refresh every minute
      const interval = setInterval(fetchDamageReports, 60000)
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

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) {
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
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{report.device_brand} {report.device_model}</h3>
                      <p className="text-sm text-gray-600">Report ID: {report.id}</p>
                    </div>
                    <span className="px-3 py-1 text-sm font-medium text-orange-800 bg-orange-100 rounded-full">
                      Awaiting Approval
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Damage Assessment</h4>
                      <p className="text-sm text-gray-600">{report.notes || 'No additional notes'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Repair Estimate</h4>
                      <p className="text-lg font-semibold text-green-600">R{report.final_total_cost || report.total_parts_cost}</p>
                    </div>
                  </div>

                  {/* Device information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Device Details</h4>
                      <p className="text-sm text-gray-600">
                        {report.device_brand} {report.device_model}
                      </p>
                      <p className="text-xs text-gray-500">{report.device_type}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Claim Information</h4>
                      <p className="text-sm text-gray-600">{report.claim_number || 'No claim number'}</p>
                      {report.imei_serial && (
                        <p className="text-xs text-gray-500">IMEI: {report.imei_serial}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Assessment</h4>
                      <p className="text-sm text-gray-600">
                        {report.tech_ber_suggestion ? 'BER Suggested' : 'Repairable'}
                      </p>
                      {report.damage_photos.length > 0 && (
                        <p className="text-xs text-gray-500">{report.damage_photos.length} photos</p>
                      )}
                    </div>
                  </div>
                  
                  {/* AI Analysis and Issues */}
                  {report.ai_checklist && report.ai_checklist.length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">🤖 AI Checklist</h4>
                      <div className="space-y-1">
                        {report.ai_checklist.map((item: string, index: number) => (
                          <div key={index} className="text-sm text-blue-800">
                            • {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.client_reported_issues && report.client_reported_issues.length > 0 && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">✅ Client Reported Issues</h4>
                      <div className="space-y-1">
                        {report.client_reported_issues.map((issue: string, index: number) => (
                          <div key={index} className="text-sm text-green-800">
                            • {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.tech_findings && report.tech_findings.length > 0 && (
                    <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">🔧 Technician Findings</h4>
                      <div className="space-y-1">
                        {report.tech_findings.map((finding: string, index: number) => (
                          <div key={index} className="text-sm text-yellow-800">
                            • {finding}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {report.final_parts_selected && report.final_parts_selected.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Parts Needed</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.final_parts_selected.map((part, index) => (
                          <span key={index} className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveReport(report.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection:')
                        if (reason) handleRejectReport(report.id, reason)
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleGeneratePDF(report.id)}
                      disabled={generatingPDF === report.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {generatingPDF === report.id ? 'Generating...' : 'Generate PDF'}
                    </button>
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
    </div>
  )
}