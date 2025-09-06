'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface BioEditorProps {
  userId: string
  currentBio?: string
  onClose: () => void
  onSave: (newBio: string) => void
}

export default function BioEditor({ userId, currentBio = '', onClose, onSave }: BioEditorProps) {
  const [bio, setBio] = useState(currentBio)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('users')
        .update({
          bio: bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        throw error
      }

      onSave(bio)
      onClose()
    } catch (err) {
      console.error('Error updating bio:', err)
      setError('Failed to update bio')
    } finally {
      setLoading(false)
    }
  }

  const bioExamples = [
    "Senior Technician specializing in iPhone and iPad repairs with 5+ years experience. Expert in screen replacements, battery repairs, and water damage restoration. Certified in Apple device diagnostics and repair procedures.",
    "Certified Android Technician with expertise in Samsung and Huawei devices. Specializes in motherboard repairs, water damage restoration, and complex component-level repairs. Advanced skills in data recovery and device diagnostics.",
    "Laptop and Tablet Specialist with advanced skills in MacBook and Surface repairs. Expert in data recovery, component-level repairs, and thermal management systems. Certified in Microsoft and Apple hardware diagnostics.",
    "Multi-Device Technician with comprehensive knowledge across all device types. Specializes in complex repairs, diagnostic procedures, and quality assurance. Expert in both hardware and software troubleshooting with 6+ years experience."
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Edit Your Bio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Professional Bio
            </label>
            <p className="text-sm text-gray-600 mb-4">
              This bio will appear in damage report PDFs sent to insurance companies. 
              Write a professional description of your skills and experience.
            </p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your professional bio here..."
            />
            <div className="text-sm text-gray-500 mt-1">
              {bio.length} characters
            </div>
          </div>

          {/* Bio Examples */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Example Bios</h3>
            <div className="space-y-3">
              {bioExamples.map((example, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setBio(example)}
                >
                  <div className="text-sm text-gray-700">{example}</div>
                  <div className="text-xs text-gray-500 mt-1">Click to use this example</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 p-4 rounded-md mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">Tips for a Great Bio:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Mention your years of experience</li>
              <li>• Highlight your specializations (iPhone, Android, laptops, etc.)</li>
              <li>• Include any certifications or qualifications</li>
              <li>• Mention specific skills (screen replacement, water damage, etc.)</li>
              <li>• Keep it professional and concise</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Bio'}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
