-- RepairShopper Integration Database Updates
-- Run this in your Supabase SQL Editor after the main schema

-- Repair Shopper ticket sync table
CREATE TABLE IF NOT EXISTS repair_shopper_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_shopper_id INTEGER NOT NULL,
  company TEXT NOT NULL CHECK (company IN ('PR', 'DD')), -- Platinum Repairs or Device Doctor
  ticket_number TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  device_info TEXT,
  problem_type TEXT,
  priority TEXT DEFAULT 'normal',
  notes TEXT,
  
  -- RepairShopper specific fields
  assigned_to TEXT,
  created_at_rs TIMESTAMP WITH TIME ZONE,
  updated_at_rs TIMESTAMP WITH TIME ZONE,
  status_changed_at_rs TIMESTAMP WITH TIME ZONE,
  
  -- Our system fields
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_tech_id UUID REFERENCES technicians(id),
  assigned_by UUID REFERENCES technicians(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- AI-powered analysis
  ai_device_analysis JSONB, -- AI extracted device info, issues, etc.
  ai_priority_score INTEGER, -- AI calculated priority (1-5)
  ai_estimated_time INTEGER, -- AI estimated repair time in minutes
  ai_complexity_score DECIMAL(3,1), -- AI complexity assessment
  ai_suggested_parts TEXT[], -- AI suggested parts needed
  ai_risk_factors TEXT[], -- AI identified risk factors
  ai_analysis_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Business logic
  is_damage_report_candidate BOOLEAN DEFAULT false,
  damage_report_id UUID REFERENCES damage_reports(id),
  damage_report_completed BOOLEAN DEFAULT false,
  damage_report_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  last_sync_status TEXT DEFAULT 'synced',
  sync_error_count INTEGER DEFAULT 0,
  
  UNIQUE(repair_shopper_id, company),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rs_tickets_status ON repair_shopper_tickets(status);
CREATE INDEX IF NOT EXISTS idx_rs_tickets_company ON repair_shopper_tickets(company);
CREATE INDEX IF NOT EXISTS idx_rs_tickets_assigned_tech ON repair_shopper_tickets(assigned_tech_id);
CREATE INDEX IF NOT EXISTS idx_rs_tickets_damage_candidate ON repair_shopper_tickets(is_damage_report_candidate);
CREATE INDEX IF NOT EXISTS idx_rs_tickets_ai_priority ON repair_shopper_tickets(ai_priority_score);
CREATE INDEX IF NOT EXISTS idx_rs_tickets_synced_at ON repair_shopper_tickets(synced_at);

-- Link damage reports to RepairShopper tickets
ALTER TABLE damage_reports ADD COLUMN IF NOT EXISTS repair_shopper_ticket_id UUID REFERENCES repair_shopper_tickets(id);

-- AI analysis cache table for performance
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT UNIQUE NOT NULL, -- Hash of the content analyzed
  analysis_type TEXT NOT NULL, -- 'device_analysis', 'priority_assessment', etc.
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_hash ON ai_analysis_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_analysis_cache(expires_at);

-- Auto-cleanup expired AI cache
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM ai_analysis_cache WHERE expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup expired cache when inserting new items
CREATE TRIGGER trigger_cleanup_ai_cache
  AFTER INSERT ON ai_analysis_cache
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_ai_cache();

-- Function to calculate business hours between timestamps (from original system)
CREATE OR REPLACE FUNCTION calculate_business_hours_between(
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
DECLARE
  business_seconds INTEGER := 0;
  current_day TIMESTAMP WITH TIME ZONE;
  day_start TIMESTAMP WITH TIME ZONE;
  day_end TIMESTAMP WITH TIME ZONE;
  effective_start TIMESTAMP WITH TIME ZONE;
  effective_end TIMESTAMP WITH TIME ZONE;
  day_of_week INTEGER;
BEGIN
  current_day := start_time::DATE + TIME '08:00:00'; -- Start at 8 AM
  
  WHILE current_day::DATE <= end_time::DATE LOOP
    day_of_week := EXTRACT(DOW FROM current_day); -- 0=Sunday, 1=Monday, etc.
    
    -- Skip weekends
    IF day_of_week NOT IN (0, 6) THEN
      day_start := current_day::DATE + TIME '08:00:00';
      day_end := current_day::DATE + TIME '17:00:00';
      
      effective_start := GREATEST(day_start, start_time);
      effective_end := LEAST(day_end, end_time);
      
      IF effective_end > effective_start THEN
        business_seconds := business_seconds + EXTRACT(EPOCH FROM (effective_end - effective_start))::INTEGER;
      END IF;
    END IF;
    
    current_day := current_day + INTERVAL '1 day';
  END LOOP;
  
  RETURN business_seconds;
END;
$$ LANGUAGE plpgsql;

-- Update repair_shopper_tickets with wait time calculation
ALTER TABLE repair_shopper_tickets 
ADD COLUMN IF NOT EXISTS business_wait_seconds INTEGER;

-- Function to update wait times
CREATE OR REPLACE FUNCTION update_ticket_wait_times()
RETURNS TRIGGER AS $$
BEGINS
  IF NEW.status_changed_at_rs IS NOT NULL THEN
    NEW.business_wait_seconds := calculate_business_hours_between(
      NEW.status_changed_at_rs, 
      NOW()
    );
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update wait times
CREATE TRIGGER trigger_update_wait_times
  BEFORE INSERT OR UPDATE ON repair_shopper_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_wait_times();