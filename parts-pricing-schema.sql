-- Parts pricing table with correct structure based on Google Sheets
CREATE TABLE IF NOT EXISTS parts_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'phone',
  insurance_price DECIMAL(10,2) NOT NULL,
  eta_info TEXT DEFAULT 'Next day',
  retail_1_year DECIMAL(10,2),
  retail_2_year DECIMAL(10,2),
  retail_lifetime DECIMAL(10,2),
  replacement_value DECIMAL(10,2),
  stock_status TEXT DEFAULT 'available',
  sheet_row_number INTEGER,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(part_name, device_brand, device_model)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parts_pricing_brand_model ON parts_pricing(device_brand, device_model);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_part_name ON parts_pricing(part_name);
CREATE INDEX IF NOT EXISTS idx_parts_pricing_stock_status ON parts_pricing(stock_status);

-- Enable RLS
ALTER TABLE parts_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Parts pricing is viewable by everyone" ON parts_pricing FOR SELECT USING (true);
