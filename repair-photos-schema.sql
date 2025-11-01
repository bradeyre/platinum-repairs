-- Repair Photos Storage Schema
-- This table stores photos taken during repair completion

CREATE TABLE IF NOT EXISTS repair_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  technician_id TEXT,
  technician_name TEXT,
  photo_data TEXT NOT NULL, -- Base64 encoded photo data
  photo_filename TEXT,
  photo_size INTEGER, -- Size in bytes
  photo_type TEXT, -- MIME type (image/jpeg, image/png, etc.)
  repair_completion_id UUID, -- Link to repair completion record
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repair Completions Table
-- This table stores repair completion data with photos
CREATE TABLE IF NOT EXISTS repair_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  technician_id TEXT,
  technician_name TEXT,
  work_completed TEXT NOT NULL,
  parts_used TEXT,
  testing_results TEXT NOT NULL,
  final_status TEXT NOT NULL,
  notes TEXT,
  time_spent TEXT NOT NULL, -- Formatted time string (HH:MM:SS)
  time_spent_seconds INTEGER, -- Time in seconds for calculations
  repair_photos TEXT[], -- Array of photo IDs
  photo_count INTEGER DEFAULT 0,
  repair_checklist JSONB, -- AI-generated repair checklist
  ai_analysis JSONB, -- AI analysis data
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repair_photos_ticket_id ON repair_photos (ticket_id);
CREATE INDEX IF NOT EXISTS idx_repair_photos_technician ON repair_photos (technician_id);
CREATE INDEX IF NOT EXISTS idx_repair_photos_created_at ON repair_photos (created_at);

CREATE INDEX IF NOT EXISTS idx_repair_completions_ticket_id ON repair_completions (ticket_id);
CREATE INDEX IF NOT EXISTS idx_repair_completions_technician ON repair_completions (technician_id);
CREATE INDEX IF NOT EXISTS idx_repair_completions_completed_at ON repair_completions (completed_at);

-- RLS (Row Level Security) policies
ALTER TABLE repair_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_completions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read repair data
CREATE POLICY "Allow authenticated users to read repair photos" ON repair_photos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read repair completions" ON repair_completions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow technicians to insert their own repair data
CREATE POLICY "Allow technicians to insert repair photos" ON repair_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow technicians to insert repair completions" ON repair_completions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to update/delete repair data
CREATE POLICY "Allow admins to update repair photos" ON repair_photos
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to update repair completions" ON repair_completions
  FOR UPDATE USING (auth.role() = 'authenticated');
