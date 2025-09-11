'use client'

import React, { useState, useEffect } from 'react'

export interface RepairChecklistItem {
  id: string
  category: 'safety' | 'functionality' | 'hardware' | 'software' | 'connectivity' | 'battery' | 'display' | 'audio'
  priority: 'critical' | 'high' | 'medium' | 'low'
  issue: string
  description: string
  verificationMethod: string
  expectedOutcome: string
  source: string
  checked: boolean
  notes: string
}

export interface RepairChecklist {
  ticketId: string
  deviceInfo: string
  summary: string
  criticalIssues: number
  totalItems: number
  checklist: RepairChecklistItem[]
  recommendations: string[]
  warnings: string[]
}

interface RepairChecklistProps {
  ticketId: string
  deviceInfo: string
  description: string
  onChecklistUpdate?: (checklist: RepairChecklist) => void
}

export default function RepairChecklistComponent({ 
  ticketId, 
  deviceInfo, 
  description,
  onChecklistUpdate 
}: RepairChecklistProps) {
  const [checklist, setChecklist] = useState<RepairChecklist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Generate checklist on component mount
  useEffect(() => {
    generateChecklist()
  }, [ticketId, deviceInfo, description])

  // Show loading state immediately when component mounts
  useEffect(() => {
    setLoading(true)
  }, [])

  const generateChecklist = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🤖 Generating AI repair checklist for ticket:', ticketId)
      
      const response = await fetch('/api/ai-repair-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          deviceInfo,
          description
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate repair checklist')
      }

      const data = await response.json()
      
      if (data.success) {
        setChecklist(data.checklist)
        onChecklistUpdate?.(data.checklist)
        console.log('✅ AI repair checklist generated successfully')
      } else {
        setChecklist(data.checklist) // Use fallback checklist
        onChecklistUpdate?.(data.checklist)
        console.log('⚠️ AI checklist generation failed, using fallback')
      }
      
    } catch (error) {
      console.error('❌ Error generating repair checklist:', error)
      setError('Failed to generate repair checklist. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (itemId: string) => {
    if (!checklist) return

    const updatedChecklist = {
      ...checklist,
      checklist: checklist.checklist.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    }
    
    setChecklist(updatedChecklist)
    onChecklistUpdate?.(updatedChecklist)
  }

  const updateItemNotes = (itemId: string, notes: string) => {
    if (!checklist) return

    const updatedChecklist = {
      ...checklist,
      checklist: checklist.checklist.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    }
    
    setChecklist(updatedChecklist)
    onChecklistUpdate?.(updatedChecklist)
  }

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'safety': return '⚠️'
      case 'functionality': return '⚙️'
      case 'hardware': return '🔧'
      case 'software': return '💻'
      case 'connectivity': return '📶'
      case 'battery': return '🔋'
      case 'display': return '📱'
      case 'audio': return '🔊'
      default: return '📋'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <div className="text-center">
            <div className="text-gray-600 font-medium">AI is analyzing your ticket...</div>
            <div className="text-sm text-gray-500 mt-1">Generating smart repair checklist based on ticket history</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow border border-red-200 p-6">
        <div className="flex items-center">
          <div className="text-red-600 mr-3">❌</div>
          <div>
            <p className="text-red-800 font-medium">Error generating checklist</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={generateChecklist}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!checklist) {
    return null
  }

  const checkedItems = checklist.checklist.filter(item => item.checked).length
  const criticalItems = checklist.checklist.filter(item => item.priority === 'critical')
  const checkedCriticalItems = criticalItems.filter(item => item.checked).length

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🤖</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Repair Checklist</h3>
              <p className="text-sm text-gray-600">Smart checklist based on ticket analysis</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Progress</div>
            <div className="text-lg font-bold text-blue-600">
              {checkedItems}/{checklist.totalItems}
            </div>
            {checklist.criticalIssues > 0 && (
              <div className="text-xs text-red-600">
                {checkedCriticalItems}/{checklist.criticalIssues} critical
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📋 Analysis Summary</h4>
          <p className="text-sm text-blue-800">{checklist.summary}</p>
        </div>

        {/* Warnings */}
        {checklist.warnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">⚠️ Important Warnings</h4>
            <ul className="space-y-1">
              {checklist.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-red-800">• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Checklist Progress</span>
            <span className="text-sm text-gray-600">{Math.round((checkedItems / checklist.totalItems) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(checkedItems / checklist.totalItems) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Checklist Items</h4>
          {checklist.checklist.map((item) => (
            <div 
              key={item.id} 
              className={`border rounded-lg p-4 transition-all ${
                item.checked 
                  ? 'bg-green-50 border-green-200' 
                  : item.priority === 'critical' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleItem(item.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getCategoryIcon(item.category)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{item.category}</span>
                  </div>
                  
                  <h5 className="font-medium text-gray-900 mb-1">{item.issue}</h5>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    <strong>Source:</strong> {item.source}
                  </div>
                  
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 mb-2"
                  >
                    {expandedItems.has(item.id) ? 'Hide Details' : 'Show Details'}
                  </button>
                  
                  {expandedItems.has(item.id) && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm">
                          <strong className="text-gray-700">How to verify:</strong>
                          <p className="text-gray-600 mt-1">{item.verificationMethod}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm">
                          <strong className="text-gray-700">Expected outcome:</strong>
                          <p className="text-gray-600 mt-1">{item.expectedOutcome}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes:
                        </label>
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.id, e.target.value)}
                          placeholder="Add notes about this item..."
                          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {checklist.recommendations.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">💡 AI Recommendations</h4>
            <ul className="space-y-1">
              {checklist.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-green-800">• {recommendation}</li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-gray-600 mr-2">ℹ️</div>
            <div>
              <p className="text-sm text-gray-800">
                <strong>AI-Generated Checklist:</strong> This checklist is generated by AI based on ticket history and device information. 
                Use it as guidance and always apply your professional judgment and experience. 
                The AI may not catch all issues, so remain vigilant for additional problems.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
