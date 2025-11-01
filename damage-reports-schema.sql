-- Damage Reports Table Schema
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dr_number TEXT UNIQUE NOT NULL,
  claim_number TEXT,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_type TEXT NOT NULL,
  imei_serial TEXT,
  storage_capacity TEXT,
  color TEXT,
  client_reported_issues TEXT[] DEFAULT '{}',
  tech_findings TEXT[] DEFAULT '{}',
  damage_photos TEXT[] DEFAULT '{}',
  tech_ber_suggestion BOOLEAN,
  manager_ber_decision BOOLEAN,
  ber_reason TEXT,
  selected_parts JSONB DEFAULT '{}',
  total_parts_cost DECIMAL(10,2) DEFAULT 0,
  final_eta_days INTEGER,
  manager_notes TEXT,
  ai_checklist TEXT[],
  ai_risk_assessment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_assessment', 'awaiting_approval', 
    'in_repair', 'quality_check', 'completed', 'ber_confirmed', 'cancelled'
  )),
  assigned_technician_id UUID,
  assigned_technician_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Store comprehensive form data
  report_data JSONB DEFAULT '{}'
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_damage_reports_status ON damage_reports(status);
CREATE INDEX IF NOT EXISTS idx_damage_reports_claim_number ON damage_reports(claim_number);
CREATE INDEX IF NOT EXISTS idx_damage_reports_dr_number ON damage_reports(dr_number);
CREATE INDEX IF NOT EXISTS idx_damage_reports_assigned_tech ON damage_reports(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_created_at ON damage_reports(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_damage_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_damage_reports_updated_at
  BEFORE UPDATE ON damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_damage_reports_updated_at();
