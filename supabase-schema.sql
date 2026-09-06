-- Idempotent: kan köras både på en ny databas och på en befintlig.
CREATE TABLE IF NOT EXISTS cars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  benefit_value NUMERIC NOT NULL,
  is_electric BOOLEAN DEFAULT FALSE,
  is_plugin_hybrid BOOLEAN DEFAULT FALSE,
  annual_km INTEGER DEFAULT 15000,
  is_leasing BOOLEAN DEFAULT TRUE,
  interest_rate NUMERIC DEFAULT 5.0,        -- Årlig ränta i procent
  leasing_period INTEGER DEFAULT 36,        -- Leasingperiod i månader
  annual_leasing_cost NUMERIC,
  service_miles INTEGER DEFAULT 500,        -- Tjänstemil per år (momsregel enligt C11)
  insurance_included_in_leasing BOOLEAN DEFAULT FALSE,
  registered_after_july_2022 BOOLEAN DEFAULT TRUE,
  vehicle_tax NUMERIC,                      -- Fordonsskatt kr/år
  extra_equipment NUMERIC DEFAULT 0,
  electric_range NUMERIC,                   -- Elektrisk räckvidd km (laddhybrid)
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Kolumner som saknas i äldre installationer
ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS registered_after_july_2022 BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS vehicle_tax NUMERIC,
  ADD COLUMN IF NOT EXISTS extra_equipment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS electric_range NUMERIC;

CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at DESC);

-- Row Level Security: varje användare ser bara sina egna bilar
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON cars;
DROP POLICY IF EXISTS "Users manage own cars" ON cars;
CREATE POLICY "Users manage own cars" ON cars
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at-trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cars_updated_at ON cars;
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
