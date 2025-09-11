'use client'

import React, { useState } from 'react'

interface TechnicianPerformance {
  technician: string
  totalTickets: number
  currentLoad: number
  averageWaitTime: number
  completionRate: number
  ticketsByStatus: Record<string, number>
  averageCompletionTime?: number
}

interface PerformanceData {
  technicians: TechnicianPerformance[]
  overallStats: {
    totalTickets: number
    averageWaitTime: number
    averageCompletionRate: number
  }
  insights: string[]
}

interface AIAnalysis {
  individualAnalysis?: Record<string, {
    performance: string
    strengths: string[]
    concerns: string[]
    trainingNeeds: string[]
    recommendations: string[]
  }>
  teamInsights?: {
    overallEfficiency: string
    bottlenecks: string[]
    workloadBalance: string
    teamRecommendations: string[]
  }
  priorityActions?: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  summary?: string
  analysis?: string
  format?: string
}

interface AIPerformanceAnalysisProps {
  performanceData: PerformanceData
}

export default function AIPerformanceAnalysis({ performanceData }: AIPerformanceAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzePerformance = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai-performance-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performanceData })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
      } else {
        setError('Failed to analyze performance data')
      }
    } catch (err) {
      setError('Error analyzing performance data')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceColor = (performance: string) => {
    switch (performance?.toLowerCase()) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'average': return 'text-yellow-600 bg-yellow-100'
      case 'needs_improvement': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🤖 AI Performance Analysis</h3>
            <p className="text-gray-600 mt-1">Get AI-powered insights and recommendations</p>
          </div>
          <button
            onClick={analyzePerformance}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Analyze Performance'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">AI is analyzing performance data...</span>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <div className="space-y-6">
          {/* Summary */}
          {analysis.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">📊 Executive Summary</h4>
              <p className="text-blue-800">{analysis.summary}</p>
            </div>
          )}

          {/* Text Analysis (fallback) */}
          {analysis.format === 'text' && analysis.analysis && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">🤖 AI Analysis</h4>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">{analysis.analysis}</pre>
              </div>
            </div>
          )}

          {/* Individual Analysis */}
          {analysis.individualAnalysis && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">👥 Individual Technician Analysis</h4>
              <div className="space-y-4">
                {Object.entries(analysis.individualAnalysis).map(([technician, data]) => (
                  <div key={technician} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-900">{technician}</h5>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(data.performance)}`}>
                        {data.performance}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div>
                        <h6 className="font-medium text-green-700 mb-2">✅ Strengths</h6>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {data.strengths.map((strength, index) => (
                            <li key={index}>• {strength}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Concerns */}
                      <div>
                        <h6 className="font-medium text-red-700 mb-2">⚠️ Areas for Improvement</h6>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {data.concerns.map((concern, index) => (
                            <li key={index}>• {concern}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Training Needs */}
                      <div>
                        <h6 className="font-medium text-blue-700 mb-2">🎓 Training Needs</h6>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {data.trainingNeeds.map((need, index) => (
                            <li key={index}>• {need}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommendations */}
                      <div>
                        <h6 className="font-medium text-purple-700 mb-2">💡 Recommendations</h6>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {data.recommendations.map((rec, index) => (
                            <li key={index}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Insights */}
          {analysis.teamInsights && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🏢 Team Performance Insights</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Overall Efficiency</h5>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(analysis.teamInsights.overallEfficiency)}`}>
                    {analysis.teamInsights.overallEfficiency}
                  </span>
                </div>

                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Workload Balance</h5>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    analysis.teamInsights.workloadBalance === 'balanced' 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-orange-600 bg-orange-100'
                  }`}>
                    {analysis.teamInsights.workloadBalance}
                  </span>
                </div>
              </div>

              {analysis.teamInsights.bottlenecks.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-red-700 mb-2">🚨 Identified Bottlenecks</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {analysis.teamInsights.bottlenecks.map((bottleneck, index) => (
                      <li key={index}>• {bottleneck}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.teamInsights.teamRecommendations.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-blue-700 mb-2">💡 Team Recommendations</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {analysis.teamInsights.teamRecommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Priority Actions */}
          {analysis.priorityActions && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🎯 Priority Actions</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Immediate Actions */}
                <div>
                  <h5 className="font-medium text-red-700 mb-3">🚨 Immediate (This Week)</h5>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {analysis.priorityActions.immediate.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Short Term Actions */}
                <div>
                  <h5 className="font-medium text-orange-700 mb-3">⏰ Short Term (This Month)</h5>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {analysis.priorityActions.shortTerm.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-500 mr-2">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Long Term Actions */}
                <div>
                  <h5 className="font-medium text-blue-700 mb-3">🎯 Long Term (Next Quarter)</h5>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {analysis.priorityActions.longTerm.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
