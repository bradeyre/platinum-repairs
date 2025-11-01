import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🗑️ Clearing existing users...')
    
    // First, clear all existing users
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all users

    if (deleteError) {
      console.log('Delete error (may be expected if no users exist):', deleteError)
    }

    // Insert the correct users with proper roles, passwords, and bios
    const users = [
      // Admin and Claim Managers (can access all areas)
      { 
        id: '00000000-0000-0000-0000-000000000001', 
        email: 'brad@platinumrepairs.co.za', 
        username: 'brad', 
        password: 'b123456', 
        role: 'admin', 
        full_name: 'Brad',
        bio: 'Senior Administrator with extensive experience in repair operations management. Oversees daily operations and ensures quality standards are maintained across all repair processes.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000002', 
        email: 'andre@platinumrepairs.co.za', 
        username: 'andre', 
        password: 'a123456', 
        role: 'admin', 
        full_name: 'Andre',
        bio: 'Operations Manager specializing in workflow optimization and team coordination. Expert in process improvement and resource allocation for maximum efficiency.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000003', 
        email: 'celeste@platinumrepairs.co.za', 
        username: 'celeste', 
        password: 'c123456', 
        role: 'admin', 
        full_name: 'Celeste',
        bio: 'Quality Assurance Manager with expertise in repair standards and customer satisfaction. Ensures all repairs meet the highest quality standards and customer expectations.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000004', 
        email: 'braam@platinumrepairs.co.za', 
        username: 'braam', 
        password: 'b123456', 
        role: 'admin', 
        full_name: 'Braam',
        bio: 'Technical Director with deep knowledge of repair methodologies and equipment. Leads technical innovation and maintains cutting-edge repair capabilities.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000005', 
        email: 'melany@platinumrepairs.co.za', 
        username: 'melany', 
        password: 'm123456', 
        role: 'admin', 
        full_name: 'Melany',
        bio: 'Administrative Coordinator focused on process improvement and documentation. Manages administrative workflows and ensures smooth operations.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000006', 
        email: 'janine@platinumrepairs.co.za', 
        username: 'janine', 
        password: 'j123456', 
        role: 'claim_manager', 
        full_name: 'Janine',
        bio: 'Quality Claims Manager ensuring accurate assessments and proper documentation for insurance submissions. Expert in compliance and regulatory requirements for insurance claims.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000007', 
        email: 'dane@platinumrepairs.co.za', 
        username: 'dane', 
        password: 'd123456', 
        role: 'claim_manager', 
        full_name: 'Dane',
        bio: 'Senior Claims Manager with extensive experience in insurance claim processing and damage assessment coordination. Expert in BER (Beyond Economic Repair) evaluations and insurance documentation.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000008', 
        email: 'derilise@platinumrepairs.co.za', 
        username: 'derilise', 
        password: 'd123456', 
        role: 'claim_manager', 
        full_name: 'Derilise',
        bio: 'Claims Processing Specialist focused on efficient workflow management and customer communication. Specializes in damage report analysis and insurance claim optimization.'
      },
      
      // Technicians
      { 
        id: '00000000-0000-0000-0000-000000000009', 
        email: 'ben@platinumrepairs.co.za', 
        username: 'ben', 
        password: 'b123456', 
        role: 'technician', 
        full_name: 'Ben',
        bio: 'Multi-Device Technician with comprehensive knowledge across all device types. Specializes in complex repairs, diagnostic procedures, and quality assurance. Expert in both hardware and software troubleshooting with 6+ years experience.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000010', 
        email: 'marshal@platinumrepairs.co.za', 
        username: 'marshal', 
        password: 'm123456', 
        role: 'technician', 
        full_name: 'Marshal',
        bio: 'Senior Technician specializing in iPhone and iPad repairs with 5+ years experience. Expert in screen replacements, battery repairs, and water damage restoration. Certified in Apple device diagnostics and repair procedures.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000011', 
        email: 'malvin@platinumrepairs.co.za', 
        username: 'malvin', 
        password: 'm123456', 
        role: 'technician', 
        full_name: 'Malvin',
        bio: 'Certified Android Technician with expertise in Samsung and Huawei devices. Specializes in motherboard repairs, water damage restoration, and complex component-level repairs. Advanced skills in data recovery and device diagnostics.'
      },
      { 
        id: '00000000-0000-0000-0000-000000000012', 
        email: 'francis@platinumrepairs.co.za', 
        username: 'francis', 
        password: 'f123456', 
        role: 'technician', 
        full_name: 'Francis',
        bio: 'Laptop and Tablet Specialist with advanced skills in MacBook and Surface repairs. Expert in data recovery, component-level repairs, and thermal management systems. Certified in Microsoft and Apple hardware diagnostics.'
      }
    ]

    console.log('👥 Inserting users with bios...')
    const { data: userData, error: userInsertError } = await supabase
      .from('users')
      .upsert(users, { onConflict: 'id' })

    if (userInsertError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to insert users',
        details: userInsertError,
        instructions: 'Please check if the users table exists in Supabase'
      })
    }

    console.log('✅ Users with bios setup completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Users with bios setup completed successfully',
      usersInserted: users.length,
      summary: {
        admins: users.filter(u => u.role === 'admin').length,
        claimManagers: users.filter(u => u.role === 'claim_manager').length,
        technicians: users.filter(u => u.role === 'technician').length
      },
      users: users.map(u => ({
        username: u.username,
        role: u.role,
        full_name: u.full_name,
        bio: u.bio ? 'Bio added' : 'No bio'
      }))
    })
  } catch (err) {
    console.error('Setup users with bios error:', err)
    return NextResponse.json({
      success: false,
      error: 'Failed to setup users with bios',
      details: err
    })
  }
}
