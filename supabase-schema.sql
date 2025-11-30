-- Create cars table for storing car information
-- Based on B16 and C11 RAM policies
CREATE TABLE IF NOT EXISTS cars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  benefit_value NUMERIC NOT NULL,
  is_electric BOOLEAN DEFAULT FALSE,
  is_plugin_hybrid BOOLEAN DEFAULT FALSE,
  annual_km INTEGER DEFAULT 15000,
  is_leasing BOOLEAN DEFAULT TRUE,
  interest_rate NUMERIC DEFAULT 5.0, -- Årlig ränta i procent
  leasing_period INTEGER DEFAULT 36, -- Leasingperiod i månader
  annual_leasing_cost NUMERIC,
  service_miles INTEGER, -- Tjänstemil per år (för momsberäkning enligt C11)
  insurance_included_in_leasing BOOLEAN DEFAULT FALSE,
  maintenance_included_in_leasing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
-- For a public calculator, you might want to restrict this
CREATE POLICY "Allow all operations" ON cars
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at DESC);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

