import { supabase } from './supabase'
import { User } from './supabase'

export interface AuthUser {
  id: string
  email: string
  username: string
  role: 'admin' | 'technician' | 'claim_manager'
  full_name?: string
}

export async function signIn(username: string, password: string): Promise<AuthUser | null> {
  try {
    console.log('🔐 Attempting sign in for username:', username)
    
    // Simple username/password system with Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // In production, use hashed passwords
      .single()

    console.log('🔐 Supabase response:', { user, error })

    if (error || !user) {
      console.error('Sign in error:', error)
      return null
    }

    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    }

    console.log('🔐 Auth user created:', authUser)

    // Store user in localStorage for session management
    setCurrentUser(authUser)
    console.log('🔐 User stored in localStorage')
    
    return authUser
  } catch (error) {
    console.error('Sign in error:', error)
    return null
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === 'undefined') {
    console.log('🔐 getCurrentUser: Server-side, returning null')
    return null
  }
  
  const userData = localStorage.getItem('currentUser')
  console.log('🔐 getCurrentUser: localStorage data:', userData ? 'exists' : 'null')
  
  if (!userData) {
    console.log('🔐 getCurrentUser: No user data found')
    return null
  }

  try {
    const user = JSON.parse(userData)
    console.log('🔐 getCurrentUser: Parsed user:', user.username, user.role)
    return user
  } catch (error) {
    console.error('🔐 getCurrentUser: Parse error:', error)
    return null
  }
}

export function setCurrentUser(user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('currentUser', JSON.stringify(user))
  console.log('🔐 User stored in localStorage:', user.username)
}

export function signOut(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('currentUser')
  window.location.href = '/login'
}

export async function requireAuth(requiredRole?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const user = await getCurrentUser()
  if (!user) return false
  
  if (requiredRole && user.role !== requiredRole) return false
  
  return true
}
