'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

interface Ticket {
  id: string
  ticketId: string
  ticketNumber: string
  company: 'PR' | 'DD'
  description: string
  status: string
  deviceInfo: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
}

interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'technician' | 'claim_manager'
  full_name?: string
}

export default function DamageReportPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const [user, setUser] = useState<User | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Form state
  const [damageAssessment, setDamageAssessment] = useState('')
  const [repairEstimate, setRepairEstimate] = useState('')
  const [partsNeeded, setPartsNeeded] = useState<string[]>([])
  const [newPart, setNewPart] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser || (currentUser.role !== 'technician' && currentUser.role !== 'admin')) {
        router.push('/login')
        return
      }
      setUser(currentUser)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (user) {
      fetchTicket()
    }
  }, [user, params])

  const fetchTicket = async () => {
    try {
      setLoading(true)
      const { ticketId } = await params
      const response = await fetch('/api/tickets')
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }
      const data = await response.json()
      
      const foundTicket = data.tickets.find((t: Ticket) => t.ticketId === `#${ticketId}`)
      if (!foundTicket) {
        throw new Error('Ticket not found')
      }
      
      setTicket(foundTicket)
      setError(null)
    } catch (err) {
      console.error('Error fetching ticket:', err)
      setError('Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  const addPart = () => {
    if (newPart.trim() && !partsNeeded.includes(newPart.trim())) {
      setPartsNeeded([...partsNeeded, newPart.trim()])
      setNewPart('')
    }
  }

  const removePart = (part: string) => {
    setPartsNeeded(partsNeeded.filter(p => p !== part))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !ticket) return

    setSaving(true)
    try {
      const response = await fetch('/api/damage-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          technicianId: user.id,
          deviceInfo: ticket.deviceInfo,
          damageAssessment,
          repairEstimate: parseFloat(repairEstimate) || 0,
          partsNeeded
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save damage report')
      }

      // Redirect back to technician dashboard
      router.push('/dashboard/technician')
    } catch (err) {
      console.error('Error saving damage report:', err)
      alert('Failed to save damage report')
    } finally {
      setSaving(false)
    }
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
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error || 'Ticket not found'}</p>
          <button 
            onClick={() => router.push('/dashboard/technician')} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/dashboard/technician')}
                className="mr-4 text-blue-600 hover:text-blue-800"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Damage Report</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{ticket.ticketId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Ticket Info */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ticket Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Device</p>
              <p className="font-medium">{ticket.deviceInfo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium">{ticket.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Company</p>
              <p className="font-medium">{ticket.company}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium">{ticket.status}</p>
            </div>
          </div>
        </div>

        {/* Damage Report Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Damage Assessment</h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="damageAssessment" className="block text-sm font-medium text-gray-700 mb-2">
                Damage Assessment *
              </label>
              <textarea
                id="damageAssessment"
                rows={6}
                value={damageAssessment}
                onChange={(e) => setDamageAssessment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the damage found, what needs to be repaired, and any additional issues discovered..."
                required
              />
            </div>

            <div>
              <label htmlFor="repairEstimate" className="block text-sm font-medium text-gray-700 mb-2">
                Repair Estimate (R)
              </label>
              <input
                type="number"
                id="repairEstimate"
                value={repairEstimate}
                onChange={(e) => setRepairEstimate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parts Needed
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newPart}
                  onChange={(e) => setNewPart(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPart())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter part name"
                />
                <button
                  type="button"
                  onClick={addPart}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add
                </button>
              </div>
              {partsNeeded.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {partsNeeded.map((part, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {part}
                      <button
                        type="button"
                        onClick={() => removePart(part)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="submit"
              disabled={saving || !damageAssessment.trim()}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Submit Damage Report'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/technician')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
