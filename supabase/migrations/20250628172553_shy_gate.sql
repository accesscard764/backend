/*
  # Fix Existing User Setup for adnan@securedevo.com

  1. Create Restaurant and Staff Setup
    - Create restaurant for SecureDevo
    - Create staff record for adnan@securedevo.com
    - Link to existing auth user if available
    - Set up default loyalty tiers and rewards

  2. Manual User Management
    - Restaurants don't self-signup
    - Admin manually creates restaurant + staff records
    - Users just sign in with existing credentials

  3. Data Structure
    - Each restaurant is isolated
    - Staff records link auth users to restaurants
    - Customers belong to specific restaurants
*/

-- Create SecureDevo restaurant
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

-- Function to link existing auth user to staff record
CREATE OR REPLACE FUNCTION link_existing_user_to_staff()
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
      
    RAISE NOTICE 'Successfully linked user % to staff record', auth_user_id;
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
      
    RAISE NOTICE 'Created staff record for adnan@securedevo.com - will be linked when user signs in';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the linking function
SELECT link_existing_user_to_staff();

-- Drop the function as it's no longer needed
DROP FUNCTION link_existing_user_to_staff();

-- Create welcome notification
INSERT INTO notifications (restaurant_id, title, message, type, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Welcome to SecureDevo Dashboard!', 'Your loyalty program is now set up and ready to use. Start by sharing your QR code with customers!', 'success', now())
ON CONFLICT DO NOTHING;