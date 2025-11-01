'use client'
// Version: 2.0 - Fixed credentials and auth issues

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getCurrentUser } from '@/lib/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (user) {
        // Redirect based on role
        if (user.role === 'admin') {
          router.push('/dashboard/admin')
        } else if (user.role === 'technician') {
          router.push('/dashboard/technician')
        } else if (user.role === 'claim_manager') {
          router.push('/dashboard/claim-manager')
        }
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Use simple auth endpoint
      const response = await fetch('/api/simple-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (data.success && data.user) {
        // Store user directly in localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.user))
        console.log('🔐 User stored directly in localStorage:', data.user.username)
        
        // Redirect based on role
        if (data.user.role === 'admin') {
          router.push('/dashboard/admin')
        } else if (data.user.role === 'technician') {
          router.push('/dashboard/technician')
        } else if (data.user.role === 'claim_manager') {
          router.push('/dashboard/claim-manager')
        }
      } else {
        setError(data.error || 'Invalid username or password')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any)
    }
  }

  const testLocalStorage = () => {
    const testUser = { id: 'test', username: 'test', role: 'admin' }
    localStorage.setItem('currentUser', JSON.stringify(testUser))
    console.log('🧪 Test user stored in localStorage')
    
    const retrieved = localStorage.getItem('currentUser')
    console.log('🧪 Retrieved from localStorage:', retrieved)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#28b2ff' }}>
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Platinum Repairs
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p><strong>Demo Credentials:</strong></p>
            <p>Admin: brad / b123456</p>
            <p>Technician: marshal / m123456</p>
            <p>Claim Manager: dane / d123456</p>
          </div>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={testLocalStorage}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Test localStorage
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
