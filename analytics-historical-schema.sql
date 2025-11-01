-- Analytics Historical Data Schema
-- This table stores daily snapshots of key performance metrics for historical analysis

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

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_historical_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_analytics_historical_updated_at
  BEFORE UPDATE ON analytics_historical
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_historical_updated_at();

-- Insert sample historical data for the last 30 days (for testing)
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
ON CONFLICT (date) DO NOTHING;

-- Create a view for easy access to recent analytics
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

-- Create a view for weekly aggregated data
CREATE OR REPLACE VIEW weekly_analytics AS
SELECT 
  DATE_TRUNC('week', date) as week_start,
  COUNT(*) as days_in_week,
  AVG(total_tickets) as avg_total_tickets,
  AVG(completed_tickets) as avg_completed_tickets,
  AVG(waiting_tickets) as avg_waiting_tickets,
  AVG(overdue_tickets) as avg_overdue_tickets,
  AVG(average_wait_time) as avg_wait_time,
  AVG(total_technicians) as avg_total_technicians,
  AVG(active_technicians) as avg_active_technicians,
  AVG(rework_rate) as avg_rework_rate,
  AVG(total_reworks) as avg_total_reworks,
  AVG(efficiency) as avg_efficiency,
  AVG(first_time_fix_rate) as avg_first_time_fix_rate,
  AVG(customer_satisfaction) as avg_customer_satisfaction
FROM analytics_historical
WHERE date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', date)
ORDER BY week_start DESC;

-- Create a view for monthly aggregated data
CREATE OR REPLACE VIEW monthly_analytics AS
SELECT 
  DATE_TRUNC('month', date) as month_start,
  COUNT(*) as days_in_month,
  AVG(total_tickets) as avg_total_tickets,
  AVG(completed_tickets) as avg_completed_tickets,
  AVG(waiting_tickets) as avg_waiting_tickets,
  AVG(overdue_tickets) as avg_overdue_tickets,
  AVG(average_wait_time) as avg_wait_time,
  AVG(total_technicians) as avg_total_technicians,
  AVG(active_technicians) as avg_active_technicians,
  AVG(rework_rate) as avg_rework_rate,
  AVG(total_reworks) as avg_total_reworks,
  AVG(efficiency) as avg_efficiency,
  AVG(first_time_fix_rate) as avg_first_time_fix_rate,
  AVG(customer_satisfaction) as avg_customer_satisfaction
FROM analytics_historical
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month_start DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON analytics_historical TO your_app_user;
-- GRANT SELECT ON recent_analytics TO your_app_user;
-- GRANT SELECT ON weekly_analytics TO your_app_user;
-- GRANT SELECT ON monthly_analytics TO your_app_user;
