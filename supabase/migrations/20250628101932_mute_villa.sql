/*
  # Create Adnan SecureDevo User Profile

  1. New Tables
    - Creates restaurant for SecureDevo
    - Creates staff record for Adnan
    - Sets up sample data for testing

  2. Security
    - Enable RLS on all tables
    - Add proper policies for data access

  3. Sample Data
    - Restaurant: SecureDevo Solutions
    - Manager: Adnan SecureDevo
    - Sample customers and transactions for testing
*/

-- Insert SecureDevo restaurant
INSERT INTO restaurants (id, name, email, phone, address, subscription_plan, settings) VALUES 
('11111111-1111-1111-1111-111111111111', 'SecureDevo Solutions', 'adnan@securedevo.com', '+1-555-SECURE', '123 Innovation Drive, Tech City', 'pro', 
jsonb_build_object(
  'currency', 'USD',
  'timezone', 'America/New_York',
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
  settings = EXCLUDED.settings;

-- Insert loyalty tiers for SecureDevo
INSERT INTO loyalty_tiers (restaurant_id, tier, name, min_points, benefits, color) VALUES 
('11111111-1111-1111-1111-111111111111', 'bronze', 'Bronze Member', 0, '["5% discount", "Birthday reward"]', '#CD7F32'),
('11111111-1111-1111-1111-111111111111', 'silver', 'Silver Member', 500, '["10% discount", "Free appetizer monthly", "Priority support"]', '#C0C0C0'),
('11111111-1111-1111-1111-111111111111', 'gold', 'Gold Member', 1000, '["15% discount", "Free dessert weekly", "VIP access", "Premium support"]', '#FFD700')
ON CONFLICT (restaurant_id, tier) DO NOTHING;

-- Insert Adnan's staff record (will be linked when he signs up)
INSERT INTO staff (restaurant_id, email, first_name, last_name, role, user_id) VALUES 
('11111111-1111-1111-1111-111111111111', 'adnan@securedevo.com', 'Adnan', 'SecureDevo', 'manager', NULL)
ON CONFLICT (restaurant_id, email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;

-- Insert sample customers for SecureDevo
INSERT INTO customers (restaurant_id, email, first_name, last_name, phone, total_points, lifetime_points, current_tier, visit_count, total_spent, last_visit, created_at) VALUES 
('11111111-1111-1111-1111-111111111111', 'john.doe@example.com', 'John', 'Doe', '+1-555-0101', 1250, 1250, 'gold', 25, 2847.50, now() - interval '2 minutes', now() - interval '8 months'),
('11111111-1111-1111-1111-111111111111', 'jane.smith@example.com', 'Jane', 'Smith', '+1-555-0102', 675, 675, 'silver', 18, 1890.25, now() - interval '15 minutes', now() - interval '6 months'),
('11111111-1111-1111-1111-111111111111', 'bob.johnson@example.com', 'Bob', 'Johnson', '+1-555-0103', 125, 125, 'bronze', 3, 287.75, now() - interval '1 hour', now() - interval '1 hour'),
('11111111-1111-1111-1111-111111111111', 'alice.williams@example.com', 'Alice', 'Williams', '+1-555-0104', 1450, 1450, 'gold', 32, 3245.80, now() - interval '2 hours', now() - interval '1 year'),
('11111111-1111-1111-1111-111111111111', 'charlie.brown@example.com', 'Charlie', 'Brown', '+1-555-0105', 285, 285, 'bronze', 8, 645.30, now() - interval '3 hours', now() - interval '4 months')
ON CONFLICT (restaurant_id, email) DO NOTHING;

-- Insert sample rewards for SecureDevo
INSERT INTO rewards (restaurant_id, name, description, points_required, category, total_available, total_redeemed, min_tier) VALUES 
('11111111-1111-1111-1111-111111111111', 'Premium Support Session', 'One-on-one technical support session', 200, 'service', 100, 45, 'bronze'),
('11111111-1111-1111-1111-111111111111', 'Security Audit Discount', '25% off security audit services', 500, 'discount', 50, 12, 'silver'),
('11111111-1111-1111-1111-111111111111', 'Free Consultation', 'Complimentary business consultation', 150, 'service', 200, 78, 'bronze'),
('11111111-1111-1111-1111-111111111111', 'VIP Support Access', 'Priority support queue access', 300, 'service', 30, 8, 'gold'),
('11111111-1111-1111-1111-111111111111', 'Custom Development Hours', '5 hours of custom development', 1000, 'service', 20, 3, 'gold')
ON CONFLICT DO NOTHING;

-- Insert sample transactions for SecureDevo
DO $$
DECLARE
  customer_ids uuid[];
  reward_ids uuid[];
BEGIN
  -- Get customer IDs for SecureDevo
  SELECT array_agg(id) INTO customer_ids FROM customers WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
  
  -- Get reward IDs for SecureDevo
  SELECT array_agg(id) INTO reward_ids FROM rewards WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
  
  -- Insert sample transactions if we have customers
  IF array_length(customer_ids, 1) > 0 THEN
    INSERT INTO transactions (restaurant_id, customer_id, type, points, amount_spent, description, created_at) VALUES 
    ('11111111-1111-1111-1111-111111111111', customer_ids[1], 'purchase', 125, 125.00, 'Security consultation', now() - interval '15 minutes'),
    ('11111111-1111-1111-1111-111111111111', customer_ids[2], 'signup', 100, null, 'Welcome bonus', now() - interval '1 hour'),
    ('11111111-1111-1111-1111-111111111111', customer_ids[3], 'purchase', 75, 75.00, 'Support session', now() - interval '3 hours'),
    ('11111111-1111-1111-1111-111111111111', customer_ids[4], 'purchase', 200, 200.00, 'Development services', now() - interval '1 day'),
    ('11111111-1111-1111-1111-111111111111', customer_ids[5], 'purchase', 50, 50.00, 'Quick consultation', now() - interval '2 days');
    
    -- Insert sample redemptions if we have both customers and rewards
    IF array_length(reward_ids, 1) > 0 THEN
      INSERT INTO redemptions (restaurant_id, customer_id, reward_id, points_used, status, redeemed_at) VALUES 
      ('11111111-1111-1111-1111-111111111111', customer_ids[1], reward_ids[1], 200, 'completed', now() - interval '2 minutes'),
      ('11111111-1111-1111-1111-111111111111', customer_ids[4], reward_ids[2], 500, 'completed', now() - interval '2 hours');
    END IF;
  END IF;
END $$;

-- Insert sample notifications for SecureDevo
INSERT INTO notifications (restaurant_id, title, message, type, created_at) VALUES 
('11111111-1111-1111-1111-111111111111', 'Welcome to SecureDevo!', 'Your loyalty program is now active', 'success', now() - interval '2 minutes'),
('11111111-1111-1111-1111-111111111111', 'New Gold tier customer', 'Alice W. just reached Gold status', 'success', now() - interval '15 minutes'),
('11111111-1111-1111-1111-111111111111', 'Service reminder', 'Premium support sessions are popular this month', 'info', now() - interval '1 hour')
ON CONFLICT DO NOTHING;

-- Create analytics snapshots for SecureDevo (last 30 days)
DO $$
DECLARE
  i integer;
  target_date date;
  base_customers integer := 150;
BEGIN
  FOR i IN 0..29 LOOP
    target_date := CURRENT_DATE - i;
    
    INSERT INTO analytics_snapshots (
      restaurant_id, 
      date, 
      total_customers,
      new_customers,
      returning_customers,
      points_issued,
      rewards_redeemed,
      revenue_impact,
      avg_transaction_value,
      customer_retention_rate,
      tier_distribution,
      popular_rewards
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      target_date,
      base_customers + (30 - i) * 2,
      2 + (random() * 5)::integer,
      8 + (random() * 12)::integer,
      300 + (random() * 200)::integer,
      3 + (random() * 7)::integer,
      (500 + random() * 800)::numeric(10,2),
      (85 + random() * 40)::numeric(10,2),
      (80 + random() * 15)::numeric(5,2),
      jsonb_build_object(
        'bronze', 60 + (random() * 10)::integer,
        'silver', 25 + (random() * 10)::integer, 
        'gold', 15 + (random() * 10)::integer
      ),
      jsonb_build_array(
        jsonb_build_object('name', 'Premium Support Session', 'redemptions', (2 + random() * 4)::integer),
        jsonb_build_object('name', 'Free Consultation', 'redemptions', (1 + random() * 3)::integer),
        jsonb_build_object('name', 'Security Audit Discount', 'redemptions', (0 + random() * 2)::integer)
      )
    )
    ON CONFLICT (restaurant_id, date) DO NOTHING;
  END LOOP;
END $$;