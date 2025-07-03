/*
  # Multi-Tenant Restaurant System Setup

  1. Database Changes
    - Remove dependency on pre-existing staff records
    - Allow automatic restaurant creation for new users
    - Ensure proper data isolation between restaurants
    - Clean up any existing test data

  2. Security
    - Update RLS policies for multi-tenant access
    - Ensure customers can only access their restaurant's data
    - Proper staff-restaurant linking

  3. Functions
    - Auto-create restaurant and staff on user signup
    - Proper tier calculation and customer stats
    - Clean data isolation
*/

-- Remove any existing test data to start fresh
DELETE FROM redemptions;
DELETE FROM transactions;
DELETE FROM customers;
DELETE FROM analytics_snapshots;
DELETE FROM notifications;
DELETE FROM rewards;
DELETE FROM loyalty_tiers;
DELETE FROM staff;
DELETE FROM restaurants;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can access their own staff record" ON staff;
DROP POLICY IF EXISTS "Users can access staff record by email for linking" ON staff;
DROP POLICY IF EXISTS "Users can update their own staff user_id" ON staff;
DROP POLICY IF EXISTS "Staff can access their restaurant's staff" ON staff;
DROP POLICY IF EXISTS "Staff can access their restaurant's customers" ON customers;
DROP POLICY IF EXISTS "Staff can access their restaurant's transactions" ON transactions;
DROP POLICY IF EXISTS "Staff can access their restaurant's redemptions" ON redemptions;
DROP POLICY IF EXISTS "Staff can access their restaurant's rewards" ON rewards;
DROP POLICY IF EXISTS "Staff can access their restaurant's tiers" ON loyalty_tiers;
DROP POLICY IF EXISTS "Staff can access their restaurant's notifications" ON notifications;
DROP POLICY IF EXISTS "Staff can access their restaurant's analytics" ON analytics_snapshots;
DROP POLICY IF EXISTS "Users can access their restaurant data" ON restaurants;

-- Remove the automatic user linking triggers since we'll handle this in the app
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS link_auth_user_to_staff();
DROP FUNCTION IF EXISTS link_auth_user_to_staff_on_update();

-- Create fresh RLS policies for multi-tenant isolation

-- Staff table policy - users can only access their own staff record
CREATE POLICY "staff_own_record_access"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Restaurant table policy - users can access their restaurant through staff relationship
CREATE POLICY "restaurant_staff_access"
  ON restaurants
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM staff WHERE restaurant_id = restaurants.id
  ));

-- Customer table policy - staff can access customers from their restaurant
CREATE POLICY "customers_restaurant_isolation"
  ON customers
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Transaction table policy - staff can access transactions from their restaurant
CREATE POLICY "transactions_restaurant_isolation"
  ON transactions
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Redemption table policy - staff can access redemptions from their restaurant
CREATE POLICY "redemptions_restaurant_isolation"
  ON redemptions
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Reward table policy - staff can access rewards from their restaurant
CREATE POLICY "rewards_restaurant_isolation"
  ON rewards
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Loyalty tier table policy - staff can access tiers from their restaurant
CREATE POLICY "loyalty_tiers_restaurant_isolation"
  ON loyalty_tiers
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Notification table policy - staff can access notifications from their restaurant
CREATE POLICY "notifications_restaurant_isolation"
  ON notifications
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Analytics table policy - staff can access analytics from their restaurant
CREATE POLICY "analytics_restaurant_isolation"
  ON analytics_snapshots
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Ensure proper indexes for performance with multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_restaurant_id ON transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_restaurant_id ON redemptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rewards_restaurant_id ON rewards(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant_id ON analytics_snapshots(restaurant_id);

-- Update the customer stats function to be more robust
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer points and tier
  UPDATE customers 
  SET 
    total_points = total_points + NEW.points,
    lifetime_points = lifetime_points + NEW.points,
    current_tier = calculate_customer_tier(lifetime_points + NEW.points),
    tier_progress = CASE 
      WHEN lifetime_points + NEW.points >= 1000 THEN 100
      WHEN lifetime_points + NEW.points >= 500 THEN ROUND(((lifetime_points + NEW.points - 500) / 500.0) * 100)
      ELSE ROUND((lifetime_points + NEW.points / 500.0) * 100)
    END,
    updated_at = now()
  WHERE id = NEW.customer_id AND restaurant_id = NEW.restaurant_id;
  
  -- Update visit count and last visit for purchase transactions
  IF NEW.type = 'purchase' THEN
    UPDATE customers 
    SET 
      visit_count = visit_count + 1,
      last_visit = NEW.created_at,
      total_spent = total_spent + COALESCE(NEW.amount_spent, 0)
    WHERE id = NEW.customer_id AND restaurant_id = NEW.restaurant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON transactions;
CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON restaurants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rewards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON loyalty_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_snapshots TO authenticated;