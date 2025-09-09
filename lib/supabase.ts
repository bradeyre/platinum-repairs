import { createClient } from '@supabase/supabase-js'

// Hardcoded values to ensure they work
const supabaseUrl = 'https://hplkxqwaxpoubbmnjulo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwbGt4cXdheHBvdWJibW5qdWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDc1MjUsImV4cCI6MjA3MTk4MzUyNX0.hbk8_vmOl6dSnL5SjHL6cICP12V9athGWzdeMpgekh4'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwbGt4cXdheHBvdWJibW5qdWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQwNzUyNSwiZXhwIjoyMDcxOTgzNTI1fQ.rnxsOlmmsM-sdwRpAGCMPkbfr-m-u9WdEIoRXLyCCs8'

// Validate values before creating client
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase configuration')
}

console.log('🔧 Supabase Configuration:')
console.log('URL:', supabaseUrl)
console.log('Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')

// Create client with minimal auth configuration to avoid conflicts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: undefined
  }
})

// Server-side Supabase client with service role (no auth features)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: undefined
  }
})

// Database types
export interface User {
  id: string
  email: string
  username: string
  role: 'admin' | 'technician' | 'claim_manager'
  full_name?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface RepairShopperTicket {
  id: string
  repair_shopper_id: number
  company: 'PR' | 'DD'
  ticket_number: string
  subject?: string
  status: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  device_info?: string
  problem_type?: string
  priority: string
  notes?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface TicketAssignment {
  id: string
  ticket_id: string
  technician_id: string
  assigned_at: string
  status: 'assigned' | 'in_progress' | 'completed'
}

export interface DamageReport {
  id: string
  ticket_id: string
  technician_id: string
  device_info: string
  damage_assessment: string
  repair_estimate: number
  parts_needed: string[]
  status: 'in_progress' | 'completed' | 'awaiting_approval'
  created_at: string
  updated_at: string
  completed_at?: string
}
// Force deployment Fri Sep  5 12:28:01 SAST 2025
