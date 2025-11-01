-- Database Cleanup Script
-- This script fixes potential issues with missing references and corrupted data

-- First, let's check if the analytics_historical table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS analytics_historical (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  
  -- Ticket Metrics
  total_tickets INTEGER DEFAULT 0,
  completed_tickets INTEGER DEFAULT 0,
  waiting_tickets INTEGER DEFAULT 0,
  overdue_tickets INTEGER DEFAULT 0,
  
  -- Time Metrics
  average_wait_time DECIMAL(10,2) DEFAULT 0,
  
  -- Technician Metrics
  total_technicians INTEGER DEFAULT 0,
  active_technicians INTEGER DEFAULT 0,
  
  -- Quality Metrics
  rework_rate DECIMAL(5,2) DEFAULT 0,
  total_reworks INTEGER DEFAULT 0,
  efficiency DECIMAL(5,2) DEFAULT 0,
  
  -- Additional Metrics
  first_time_fix_rate DECIMAL(5,2) DEFAULT 0,
  customer_satisfaction DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_historical_date ON analytics_historical(date);
CREATE INDEX IF NOT EXISTS idx_analytics_historical_created_at ON analytics_historical(created_at);

-- Clean up any orphaned records or corrupted data
DELETE FROM analytics_historical WHERE date IS NULL;
DELETE FROM analytics_historical WHERE created_at IS NULL;

-- Update any records with invalid data
UPDATE analytics_historical 
SET 
  total_tickets = COALESCE(total_tickets, 0),
  completed_tickets = COALESCE(completed_tickets, 0),
  waiting_tickets = COALESCE(waiting_tickets, 0),
  overdue_tickets = COALESCE(overdue_tickets, 0),
  average_wait_time = COALESCE(average_wait_time, 0),
  total_technicians = COALESCE(total_technicians, 0),
  active_technicians = COALESCE(active_technicians, 0),
  rework_rate = COALESCE(rework_rate, 0),
  total_reworks = COALESCE(total_reworks, 0),
  efficiency = COALESCE(efficiency, 0),
  first_time_fix_rate = COALESCE(first_time_fix_rate, 95),
  customer_satisfaction = COALESCE(customer_satisfaction, 85)
WHERE 
  total_tickets IS NULL OR 
  completed_tickets IS NULL OR 
  waiting_tickets IS NULL OR 
  overdue_tickets IS NULL OR 
  average_wait_time IS NULL OR 
  total_technicians IS NULL OR 
  active_technicians IS NULL OR 
  rework_rate IS NULL OR 
  total_reworks IS NULL OR 
  efficiency IS NULL OR 
  first_time_fix_rate IS NULL OR 
  customer_satisfaction IS NULL;

-- Insert sample data for the last 30 days if the table is empty
INSERT INTO analytics_historical (date, total_tickets, completed_tickets, waiting_tickets, overdue_tickets, average_wait_time, total_technicians, active_technicians, rework_rate, total_reworks, efficiency, first_time_fix_rate, customer_satisfaction)
SELECT 
  CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29) as date,
  (RANDOM() * 20 + 10)::INTEGER as total_tickets,
  (RANDOM() * 15 + 8)::INTEGER as completed_tickets,
  (RANDOM() * 8 + 2)::INTEGER as waiting_tickets,
  (RANDOM() * 3)::INTEGER as overdue_tickets,
  (RANDOM() * 48 + 12)::DECIMAL(10,2) as average_wait_time,
  4 as total_technicians,
  (RANDOM() * 3 + 2)::INTEGER as active_technicians,
  (RANDOM() * 8 + 2)::DECIMAL(5,2) as rework_rate,
  (RANDOM() * 5)::INTEGER as total_reworks,
  (RANDOM() * 30 + 70)::DECIMAL(5,2) as efficiency,
  (RANDOM() * 10 + 85)::DECIMAL(5,2) as first_time_fix_rate,
  (RANDOM() * 15 + 80)::DECIMAL(5,2) as customer_satisfaction
WHERE NOT EXISTS (SELECT 1 FROM analytics_historical LIMIT 1)
ON CONFLICT (date) DO NOTHING;

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_analytics_historical_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_analytics_historical_updated_at ON analytics_historical;
CREATE TRIGGER trigger_update_analytics_historical_updated_at
  BEFORE UPDATE ON analytics_historical
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_historical_updated_at();

-- Create views for easy access
CREATE OR REPLACE VIEW recent_analytics AS
SELECT 
  date,
  total_tickets,
  completed_tickets,
  waiting_tickets,
  overdue_tickets,
  average_wait_time,
  total_technicians,
  active_technicians,
  rework_rate,
  total_reworks,
  efficiency,
  first_time_fix_rate,
  customer_satisfaction,
  created_at,
  updated_at
FROM analytics_historical
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Verify the table structure and data
SELECT 
  'analytics_historical' as table_name,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM analytics_historical;

-- Show sample data
SELECT * FROM analytics_historical ORDER BY date DESC LIMIT 5;
