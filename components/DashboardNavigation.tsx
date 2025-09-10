'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface DashboardNavigationProps {
  currentSection: 'admin' | 'technician' | 'claim-manager'
  userRole?: string
}

export default function DashboardNavigation({ currentSection, userRole }: DashboardNavigationProps) {
  const router = useRouter()

  const sections = [
    { id: 'admin', label: 'Admin Dashboard', path: '/dashboard/admin', roles: ['admin'] },
    { id: 'technician', label: 'Technician Dashboard', path: '/dashboard/technician', roles: ['admin', 'technician'] },
    { id: 'claim-manager', label: 'Claim Manager', path: '/dashboard/claim-manager', roles: ['admin', 'claim_manager'] }
  ]

  const handleSectionChange = (section: typeof sections[0]) => {
    router.push(section.path)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-bold text-gray-900">Platinum Repairs</h1>
          <nav className="flex space-x-6">
            {sections
              .filter(section => !userRole || section.roles.includes(userRole))
              .map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentSection === section.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {section.label}
                </button>
              ))}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Welcome, {userRole === 'admin' ? 'Admin User' : userRole === 'technician' ? 'Technician' : 'Claim Manager'}
          </span>
          <button
            onClick={() => {
              localStorage.removeItem('user')
              router.push('/login')
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
