'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'technician' | 'claim_manager'
  full_name?: string
  bio?: string
  created_at: string
  updated_at: string
}

interface UserManagementProps {
  onClose: () => void
}

export default function UserManagement({ onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'technician' as 'admin' | 'technician' | 'claim_manager',
    full_name: '',
    bio: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  // Debug logging for form state
  useEffect(() => {
    console.log('🔧 Form render check - showAddForm:', showAddForm, 'editingUser:', editingUser, 'should show:', (showAddForm || editingUser))
  }, [showAddForm, editingUser])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            email: formData.email,
            username: formData.username,
            role: formData.role,
            full_name: formData.full_name,
            bio: formData.bio,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)

        if (error) throw error
      } else {
        // Add new user
        const { error } = await supabase
          .from('users')
          .insert({
            email: formData.email,
            username: formData.username,
            password: formData.password,
            role: formData.role,
            full_name: formData.full_name,
            bio: formData.bio
          })

        if (error) throw error
      }

      // Reset form and refresh users
      setEditingUser(null)
      setShowAddForm(false)
      setFormData({
        email: '',
        username: '',
        password: '',
        role: 'technician',
        full_name: '',
        bio: ''
      })
      setSuccess(editingUser ? 'User updated successfully!' : 'User added successfully!')
      setError(null)
      await fetchUsers()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving user:', err)
      setError('Failed to save user')
      setSuccess(null)
    }
  }

  const handleEditUser = (user: User) => {
    console.log('🔧 handleEditUser called with:', user)
    console.log('🔧 Setting editingUser to:', user)
    setEditingUser(user)
    setFormData({
      email: user.email,
      username: user.username,
      password: '', // Don't show existing password
      role: user.role,
      full_name: user.full_name || '',
      bio: user.bio || ''
    })
    setShowAddForm(false)
    console.log('🔧 Form should now be visible - editingUser set, showAddForm false')
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      await fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError('Failed to delete user')
    }
  }

  const handleCancel = () => {
    setEditingUser(null)
    setShowAddForm(false)
    setFormData({
      email: '',
      username: '',
      password: '',
      role: 'technician',
      full_name: '',
      bio: ''
    })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'technician': return 'bg-blue-100 text-blue-800'
      case 'claim_manager': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Loading users...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add User
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Debug Info */}
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
            <strong>DEBUG INFO:</strong> showAddForm: {showAddForm.toString()}, editingUser: {editingUser ? `SET (${editingUser.username})` : 'NULL'}, Should show form: {(showAddForm || !!editingUser).toString()}
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Add/Edit Form */}
          {(showAddForm || editingUser) && (
            <div className="bg-blue-100 border-4 border-blue-500 p-6 rounded-lg mb-6" style={{ zIndex: 1000, position: 'relative' }}>
              <h3 className="text-lg font-semibold mb-4 text-blue-800">
                {editingUser ? `🔧 EDITING USER: ${editingUser.username}` : 'Add New User'}
              </h3>
              <div className="text-sm text-blue-600 mb-4">
                DEBUG: Form is rendering! showAddForm: {showAddForm.toString()}, editingUser: {editingUser ? 'SET' : 'NULL'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                    <option value="claim_manager">Claim Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio {formData.role === 'technician' && <span className="text-blue-600 font-semibold">(Required for Technicians)</span>}
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    {formData.role === 'technician' 
                      ? "This bio will appear in damage report PDFs sent to insurance companies. Include your experience, specializations, and certifications."
                      : "Optional bio for this user."
                    }
                  </p>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.role === 'technician' 
                      ? "e.g., Senior Technician specializing in iPhone and iPad repairs with 5+ years experience. Expert in screen replacements, battery repairs, and water damage restoration. Certified in Apple device diagnostics and repair procedures."
                      : "Enter user bio..."
                    }
                    required={formData.role === 'technician'}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.bio.length} characters {formData.role === 'technician' && formData.bio.length < 50 && <span className="text-orange-600">(Consider adding more detail for insurance reports)</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveUser}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  {editingUser ? 'Update User' : 'Add User'}
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || user.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        {user.bio ? (
                          <div>
                            <div className="line-clamp-2">{user.bio}</div>
                            {user.bio.length > 100 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {user.bio.length} characters
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No bio</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('🔧 EDIT BUTTON CLICKED!', user)
                            alert('Edit button clicked for: ' + user.username)
                            handleEditUser(user)
                          }}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer"
                          style={{ cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found. Click "Add User" to create the first user.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
