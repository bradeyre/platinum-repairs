'use client'

import React, { useState, useEffect } from 'react'

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

interface PartsPricingModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectParts: (parts: PartsPricing[]) => void
  selectedParts?: PartsPricing[]
  deviceBrand?: string
  deviceModel?: string
}

export default function PartsPricingModal({ 
  isOpen, 
  onClose, 
  onSelectParts, 
  selectedParts = [],
  deviceBrand,
  deviceModel 
}: PartsPricingModalProps) {
  const [parts, setParts] = useState<PartsPricing[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState(deviceBrand || '')
  const [selectedModel, setSelectedModel] = useState(deviceModel || '')
  const [localSelectedParts, setLocalSelectedParts] = useState<PartsPricing[]>(selectedParts)

  useEffect(() => {
    if (isOpen) {
      fetchBrands()
      fetchParts()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand)
    }
  }, [selectedBrand])

  useEffect(() => {
    fetchParts()
  }, [selectedBrand, selectedModel, searchTerm])

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/parts-pricing?action=brands')
      const data = await response.json()
      if (data.success) {
        setBrands(data.brands)
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const fetchModels = async (brand: string) => {
    try {
      const response = await fetch(`/api/parts-pricing?action=models&brand=${encodeURIComponent(brand)}`)
      const data = await response.json()
      if (data.success) {
        setModels(data.models)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    }
  }

  const fetchParts = async () => {
    setLoading(true)
    try {
      let url = '/api/parts-pricing?'
      const params = new URLSearchParams()
      
      if (selectedBrand) params.append('brand', selectedBrand)
      if (selectedModel) params.append('model', selectedModel)
      if (searchTerm) params.append('search', searchTerm)
      
      url += params.toString()
      
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setParts(data.parts)
      }
    } catch (error) {
      console.error('Error fetching parts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePartSelect = (part: PartsPricing) => {
    const isSelected = localSelectedParts.some(p => 
      p.part_name === part.part_name && 
      p.device_brand === part.device_brand && 
      p.device_model === part.device_model
    )
    
    if (isSelected) {
      setLocalSelectedParts(localSelectedParts.filter(p => 
        !(p.part_name === part.part_name && 
          p.device_brand === part.device_brand && 
          p.device_model === part.device_model)
      ))
    } else {
      setLocalSelectedParts([...localSelectedParts, part])
    }
  }

  const handleConfirm = () => {
    onSelectParts(localSelectedParts)
    onClose()
  }

  const totalCost = localSelectedParts.reduce((sum, part) => sum + part.insurance_price, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Parts Pricing</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Brands</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedBrand}
              >
                <option value="">All Models</option>
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search parts..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Selected Parts Summary */}
          {localSelectedParts.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-blue-900 mb-2">
                Selected Parts ({localSelectedParts.length})
              </h3>
              <div className="text-sm text-blue-800">
                Total Cost: <span className="font-semibold">R {totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Parts List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading parts...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parts.map((part, index) => {
                const isSelected = localSelectedParts.some(p => 
                  p.part_name === part.part_name && 
                  p.device_brand === part.device_brand && 
                  p.device_model === part.device_model
                )
                
                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePartSelect(part)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{part.part_name}</h4>
                      {isSelected && (
                        <span className="text-blue-600">✓</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {part.device_brand} {part.device_model}
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      R {part.insurance_price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {part.stock_status} • {part.eta_info}
                    </p>
                    {part.replacement_value && (
                      <p className="text-xs text-blue-600 mt-1">
                        Replacement Value: R {part.replacement_value.toFixed(2)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {parts.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No parts found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {localSelectedParts.length} parts selected • Total: R {totalCost.toFixed(2)}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
