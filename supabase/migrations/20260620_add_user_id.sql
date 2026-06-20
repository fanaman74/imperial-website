-- Add user_id to imperial_orders
ALTER TABLE imperial_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add user_id to imperial_reservations
ALTER TABLE imperial_reservations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS: users can read their own orders
CREATE POLICY "Users can read own orders"
  ON imperial_orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: users can read their own reservations
CREATE POLICY "Users can read own reservations"
  ON imperial_reservations
  FOR SELECT
  USING (auth.uid() = user_id);
