/*
  # Automatic Restaurant Setup System

  1. Database Changes
    - Clean up existing data for fresh start
    - Ensure proper RLS policies for multi-tenant isolation
    - Remove manual linking requirements

  2. Security
    - Restaurant-based data isolation
    - Automatic restaurant creation for new users
    - Proper staff-restaurant linking

  3. Multi-Tenant Features
    - Each user gets their own restaurant automatically
    - Fresh dashboard for each new restaurant manager
    - Isolated QR codes and customer data
*/

-- Clean up any existing data for fresh start
DELETE FROM redemptions;
DELETE FROM transactions;
DELETE FROM customers;
DELETE FROM analytics_snapshots;
DELETE FROM notifications;
DELETE FROM rewards;
DELETE FROM loyalty_tiers;
DELETE FROM staff;
DELETE FROM restaurants;

-- Drop all existing policies to avoid conflicts
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

-- Create comprehensive RLS policies for multi-tenant isolation

-- Staff table policy - users can only access their own staff record
CREATE POLICY "Users can access their own staff record"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Restaurant table policy - users can access their restaurant through staff relationship
CREATE POLICY "Users can access their restaurant data"
  ON restaurants
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM staff WHERE restaurant_id = restaurants.id
  ));

-- Customer table policy - staff can access customers from their restaurant
CREATE POLICY "Staff can access their restaurant's customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Transaction table policy - staff can access transactions from their restaurant
CREATE POLICY "Staff can access their restaurant's transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Redemption table policy - staff can access redemptions from their restaurant
CREATE POLICY "Staff can access their restaurant's redemptions"
  ON redemptions
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Reward table policy - staff can access rewards from their restaurant
CREATE POLICY "Staff can access their restaurant's rewards"
  ON rewards
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Loyalty tier table policy - staff can access tiers from their restaurant
CREATE POLICY "Staff can access their restaurant's tiers"
  ON loyalty_tiers
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Notification table policy - staff can access notifications from their restaurant
CREATE POLICY "Staff can access their restaurant's notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Analytics table policy - staff can access analytics from their restaurant
CREATE POLICY "Staff can access their restaurant's analytics"
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

-- Create the existing SecureDevo restaurant for adnan@securedevo.com
INSERT INTO restaurants (id, name, email, phone, address, subscription_plan, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'SecureDevo Solutions', 'adnan@securedevo.com', '+971-50-123-4567', 'Dubai, UAE', 'pro', 
jsonb_build_object(
  'currency', 'AED',
  'timezone', 'Asia/Dubai',
  'points_per_dollar', 1,
  'welcome_bonus', 100,
  'referral_bonus', 200
))
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  subscription_plan = EXCLUDED.subscription_plan,
  settings = EXCLUDED.settings,
  updated_at = now();

-- Create loyalty tiers for SecureDevo
INSERT INTO loyalty_tiers (restaurant_id, tier, name, min_points, benefits, color) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'bronze', 'Bronze Member', 0, '["5% discount", "Birthday reward"]', '#CD7F32'),
('550e8400-e29b-41d4-a716-446655440000', 'silver', 'Silver Member', 500, '["10% discount", "Free appetizer monthly", "Priority support"]', '#C0C0C0'),
('550e8400-e29b-41d4-a716-446655440000', 'gold', 'Gold Member', 1000, '["15% discount", "Free dessert weekly", "VIP access", "Premium support"]', '#FFD700')
ON CONFLICT (restaurant_id, tier) DO NOTHING;

-- Create default rewards for SecureDevo
INSERT INTO rewards (restaurant_id, name, description, points_required, category, total_available, total_redeemed, min_tier) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Free Consultation', 'Complimentary 30-minute business consultation', 200, 'service', 100, 0, 'bronze'),
('550e8400-e29b-41d4-a716-446655440000', 'Security Audit Discount', '25% off security audit services', 500, 'discount', 50, 0, 'silver'),
('550e8400-e29b-41d4-a716-446655440000', 'Premium Support Package', 'Priority support access for 3 months', 300, 'service', 30, 0, 'silver'),
('550e8400-e29b-41d4-a716-446655440000', 'Custom Development Hours', '5 hours of custom development work', 1000, 'service', 20, 0, 'gold'),
('550e8400-e29b-41d4-a716-446655440000', 'VIP Consultation Package', 'Full-day strategic consultation with CEO', 1500, 'service', 10, 0, 'gold')
ON CONFLICT DO NOTHING;

-- Function to link existing auth user to staff record for SecureDevo
CREATE OR REPLACE FUNCTION link_existing_securedevo_user()
RETURNS void AS $$
DECLARE
  auth_user_id uuid;
BEGIN
  -- Find the auth user by email
  SELECT id INTO auth_user_id
  FROM auth.users 
  WHERE email = 'adnan@securedevo.com'
  LIMIT 1;
  
  IF auth_user_id IS NOT NULL THEN
    -- Create or update staff record with the found user_id
    INSERT INTO staff (restaurant_id, user_id, email, first_name, last_name, role, permissions, is_active) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', auth_user_id, 'adnan@securedevo.com', 'Adnan', 'SecureDevo', 'manager', 
    '["manage_customers", "manage_rewards", "view_analytics", "manage_staff", "manage_settings", "export_data", "manage_billing"]', true)
    ON CONFLICT (restaurant_id, email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions,
      is_active = EXCLUDED.is_active,
      last_login = now(),
      updated_at = now();
      
    RAISE NOTICE 'Successfully linked user % to SecureDevo staff record', auth_user_id;
  ELSE
    -- Create staff record without user_id (will be linked when user signs in)
    INSERT INTO staff (restaurant_id, email, first_name, last_name, role, permissions, is_active) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'adnan@securedevo.com', 'Adnan', 'SecureDevo', 'manager', 
    '["manage_customers", "manage_rewards", "view_analytics", "manage_staff", "manage_settings", "export_data", "manage_billing"]', true)
    ON CONFLICT (restaurant_id, email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions,
      is_active = EXCLUDED.is_active,
      updated_at = now();
      
    RAISE NOTICE 'Created SecureDevo staff record - will be linked when user signs in';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the linking function
SELECT link_existing_securedevo_user();

-- Drop the function as it's no longer needed
DROP FUNCTION link_existing_securedevo_user();

-- Create welcome notification for SecureDevo
INSERT INTO notifications (restaurant_id, title, message, type, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Welcome to SecureDevo Dashboard!', 'Your loyalty program is now set up and ready to use. Start by sharing your QR code with customers!', 'success', now())
ON CONFLICT DO NOTHING;