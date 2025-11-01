'use client'

import React, { useState } from 'react'

export interface RepairSuggestion {
  category: 'diagnosis' | 'repair' | 'testing' | 'parts' | 'safety'
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  reasoning: string
  confidence: number // 0-100
}

export interface AIAnalysisResult {
  deviceType: string
  likelyIssues: string[]
  repairSuggestions: RepairSuggestion[]
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
  estimatedTime: string
  safetyWarnings: string[]
  partsRecommendations: string[]
  testingSteps: string[]
}

interface AIRepairAssistantProps {
  ticketId: string
  deviceInfo: string
  description: string
  symptoms?: string
  onAnalysisComplete?: (analysis: AIAnalysisResult) => void
}

export default function AIRepairAssistantComponent({ 
  ticketId, 
  deviceInfo, 
  description, 
  symptoms,
  onAnalysisComplete 
}: AIRepairAssistantProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleAnalyze = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🤖 Starting AI analysis for ticket:', ticketId)
      
      const response = await fetch('/api/ai-repair-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceInfo,
          description,
          symptoms
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI analysis')
      }

      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
        onAnalysisComplete?.(data.analysis)
        console.log('✅ AI analysis completed successfully')
      } else {
        setAnalysis(data.analysis) // Use fallback analysis
        onAnalysisComplete?.(data.analysis)
        console.log('⚠️ AI analysis failed, using fallback')
      }
      
    } catch (error) {
      console.error('❌ AI analysis failed:', error)
      setError('Failed to analyze repair request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'complex': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'diagnosis': return '🔍'
      case 'repair': return '🔧'
      case 'testing': return '🧪'
      case 'parts': return '📦'
      case 'safety': return '⚠️'
      default: return '📋'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🤖</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Repair Assistant</h3>
              <p className="text-sm text-gray-600">Intelligent repair guidance and analysis</p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : (
              <>
                <span>🔍</span>
                Analyze Repair
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <div className="text-red-400 mr-3">❌</div>
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={handleAnalyze}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="p-6 space-y-6">
          {/* Quick Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Device Type</div>
              <div className="text-lg font-semibold text-gray-900">{analysis.deviceType}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Complexity</div>
              <div className="text-lg font-semibold">
                <span className={`px-2 py-1 rounded-full text-sm ${getComplexityColor(analysis.estimatedComplexity)}`}>
                  {analysis.estimatedComplexity}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-600">Estimated Time</div>
              <div className="text-lg font-semibold text-gray-900">{analysis.estimatedTime}</div>
            </div>
          </div>

          {/* Likely Issues */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">🔍 Likely Issues</h4>
            <div className="space-y-2">
              {analysis.likelyIssues.map((issue, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">{issue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Warnings */}
          {analysis.safetyWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-yellow-800 mb-3">⚠️ Safety Warnings</h4>
              <div className="space-y-2">
                {analysis.safetyWarnings.map((warning, index) => (
                  <div key={index} className="flex items-start">
                    <div className="text-yellow-600 mr-2">⚠️</div>
                    <span className="text-sm text-yellow-800">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parts Recommendations */}
          {analysis.partsRecommendations.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">📦 Recommended Parts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.partsRecommendations.map((part, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <span className="text-sm text-blue-800">{part}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testing Steps */}
          {analysis.testingSteps.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">🧪 Testing Steps</h4>
              <div className="space-y-2">
                {analysis.testingSteps.map((step, index) => (
                  <div key={index} className="flex items-start">
                    <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repair Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-semibold text-gray-900">💡 Repair Suggestions</h4>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showDetails ? 'Show Less' : 'Show Details'}
              </button>
            </div>
            
            <div className="space-y-3">
              {analysis.repairSuggestions.map((suggestion, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getCategoryIcon(suggestion.category)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority} priority
                      </span>
                      <span className="ml-2 text-xs text-gray-500 capitalize">
                        {suggestion.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {suggestion.confidence}% confidence
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-900 mb-2">{suggestion.suggestion}</p>
                  
                  {showDetails && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">
                        <strong>Reasoning:</strong> {suggestion.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-blue-600 mr-2">ℹ️</div>
              <div>
                <p className="text-sm text-blue-800">
                  <strong>AI Assistant Disclaimer:</strong> This analysis is provided by an AI assistant 
                  and should be used as guidance only. Always follow proper safety procedures, 
                  manufacturer guidelines, and your workshop's standard practices. 
                  The AI suggestions are not a substitute for professional judgment and experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">AI is analyzing your repair request...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && !error && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">AI Repair Assistant Ready</h4>
          <p className="text-gray-600 mb-4">
            Get intelligent repair guidance, safety warnings, and step-by-step suggestions 
            for your device repair.
          </p>
          <button
            onClick={handleAnalyze}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start AI Analysis
          </button>
        </div>
      )}
    </div>
  )
}
