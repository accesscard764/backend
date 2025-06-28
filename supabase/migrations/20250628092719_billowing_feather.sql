/*
  # TableLoyalty Complete Database Schema

  1. New Tables
    - `restaurants` - Restaurant information and settings
    - `customers` - Customer profiles and loyalty data
    - `loyalty_tiers` - Tier definitions (Bronze, Silver, Gold)
    - `rewards` - Available rewards catalog
    - `transactions` - Point earning transactions
    - `redemptions` - Reward redemption history
    - `staff` - Staff members and roles
    - `notifications` - System notifications
    - `analytics_snapshots` - Daily analytics data

  2. Security
    - Enable RLS on all tables
    - Add policies for restaurant-based access control
    - Staff role-based permissions

  3. Functions & Triggers
    - Auto-calculate customer tiers
    - Generate analytics snapshots
    - Real-time notifications
*/

-- Create custom types
CREATE TYPE tier_level AS ENUM ('bronze', 'silver', 'gold');
CREATE TYPE transaction_type AS ENUM ('purchase', 'bonus', 'referral', 'signup');
CREATE TYPE staff_role AS ENUM ('manager', 'staff', 'admin');
CREATE TYPE notification_type AS ENUM ('success', 'warning', 'info', 'error');

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  logo_url text,
  settings jsonb DEFAULT '{}',
  subscription_plan text DEFAULT 'basic',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Loyalty tiers configuration
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  tier tier_level NOT NULL,
  name text NOT NULL,
  min_points integer NOT NULL DEFAULT 0,
  benefits jsonb DEFAULT '[]',
  color text DEFAULT '#1E2A78',
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, tier)
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  date_of_birth date,
  total_points integer DEFAULT 0,
  lifetime_points integer DEFAULT 0,
  current_tier tier_level DEFAULT 'bronze',
  tier_progress integer DEFAULT 0,
  last_visit timestamptz,
  visit_count integer DEFAULT 0,
  total_spent decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, email)
);

-- Rewards catalog
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  points_required integer NOT NULL,
  category text DEFAULT 'general',
  image_url text,
  terms_conditions text,
  max_redemptions_per_customer integer,
  total_available integer,
  total_redeemed integer DEFAULT 0,
  min_tier tier_level DEFAULT 'bronze',
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Point earning transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  points integer NOT NULL,
  amount_spent decimal(10,2),
  description text,
  reference_id text,
  created_at timestamptz DEFAULT now()
);

-- Reward redemptions
CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE,
  points_used integer NOT NULL,
  status text DEFAULT 'pending',
  redeemed_at timestamptz DEFAULT now(),
  used_at timestamptz,
  staff_id uuid,
  notes text
);

-- Staff management
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role staff_role DEFAULT 'staff',
  permissions jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, email)
);

-- Notifications system
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type DEFAULT 'info',
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Analytics snapshots for dashboard
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_customers integer DEFAULT 0,
  new_customers integer DEFAULT 0,
  returning_customers integer DEFAULT 0,
  points_issued integer DEFAULT 0,
  rewards_redeemed integer DEFAULT 0,
  revenue_impact decimal(10,2) DEFAULT 0,
  avg_transaction_value decimal(10,2) DEFAULT 0,
  customer_retention_rate decimal(5,2) DEFAULT 0,
  tier_distribution jsonb DEFAULT '{}',
  popular_rewards jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, date)
);

-- Enable Row Level Security
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant-based access
CREATE POLICY "Users can access their restaurant data" ON restaurants
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM staff WHERE restaurant_id = restaurants.id
  ));

CREATE POLICY "Staff can access their restaurant's tiers" ON loyalty_tiers
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can access their restaurant's customers" ON customers
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can access their restaurant's rewards" ON rewards
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can access their restaurant's transactions" ON transactions
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can access their restaurant's redemptions" ON redemptions
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can access their restaurant's staff" ON staff
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can access their restaurant's notifications" ON notifications
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Staff can access their restaurant's analytics" ON analytics_snapshots
  FOR ALL TO authenticated
  USING (restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE user_id = auth.uid()
  ));

-- Functions for tier calculation
CREATE OR REPLACE FUNCTION calculate_customer_tier(customer_points integer)
RETURNS tier_level AS $$
BEGIN
  IF customer_points >= 1000 THEN
    RETURN 'gold';
  ELSIF customer_points >= 500 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update customer tier and stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer points and tier
  UPDATE customers 
  SET 
    total_points = total_points + NEW.points,
    lifetime_points = lifetime_points + NEW.points,
    current_tier = calculate_customer_tier(total_points + NEW.points),
    updated_at = now()
  WHERE id = NEW.customer_id;
  
  -- Update visit count and last visit for purchase transactions
  IF NEW.type = 'purchase' THEN
    UPDATE customers 
    SET 
      visit_count = visit_count + 1,
      last_visit = NEW.created_at,
      total_spent = total_spent + COALESCE(NEW.amount_spent, 0)
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic customer stats update
CREATE TRIGGER update_customer_stats_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Function to generate daily analytics snapshot
CREATE OR REPLACE FUNCTION generate_daily_analytics(target_restaurant_id uuid, target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  total_customers_count integer;
  new_customers_count integer;
  returning_customers_count integer;
  points_issued_count integer;
  rewards_redeemed_count integer;
  revenue_impact_amount decimal(10,2);
  tier_dist jsonb;
  popular_rewards_data jsonb;
BEGIN
  -- Calculate metrics
  SELECT COUNT(*) INTO total_customers_count
  FROM customers 
  WHERE restaurant_id = target_restaurant_id AND is_active = true;
  
  SELECT COUNT(*) INTO new_customers_count
  FROM customers 
  WHERE restaurant_id = target_restaurant_id 
    AND DATE(created_at) = target_date;
  
  SELECT COUNT(DISTINCT customer_id) INTO returning_customers_count
  FROM transactions 
  WHERE restaurant_id = target_restaurant_id 
    AND DATE(created_at) = target_date
    AND customer_id IN (
      SELECT id FROM customers 
      WHERE restaurant_id = target_restaurant_id 
        AND DATE(created_at) < target_date
    );
  
  SELECT COALESCE(SUM(points), 0) INTO points_issued_count
  FROM transactions 
  WHERE restaurant_id = target_restaurant_id 
    AND DATE(created_at) = target_date;
  
  SELECT COUNT(*) INTO rewards_redeemed_count
  FROM redemptions 
  WHERE restaurant_id = target_restaurant_id 
    AND DATE(redeemed_at) = target_date;
  
  SELECT COALESCE(SUM(amount_spent), 0) INTO revenue_impact_amount
  FROM transactions 
  WHERE restaurant_id = target_restaurant_id 
    AND DATE(created_at) = target_date
    AND amount_spent IS NOT NULL;
  
  -- Calculate tier distribution
  SELECT jsonb_build_object(
    'bronze', COUNT(*) FILTER (WHERE current_tier = 'bronze'),
    'silver', COUNT(*) FILTER (WHERE current_tier = 'silver'),
    'gold', COUNT(*) FILTER (WHERE current_tier = 'gold')
  ) INTO tier_dist
  FROM customers 
  WHERE restaurant_id = target_restaurant_id AND is_active = true;
  
  -- Calculate popular rewards
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', r.name,
      'redemptions', COUNT(rd.id)
    ) ORDER BY COUNT(rd.id) DESC
  ) INTO popular_rewards_data
  FROM rewards r
  LEFT JOIN redemptions rd ON r.id = rd.reward_id 
    AND DATE(rd.redeemed_at) = target_date
  WHERE r.restaurant_id = target_restaurant_id
  GROUP BY r.id, r.name
  LIMIT 5;
  
  -- Insert or update analytics snapshot
  INSERT INTO analytics_snapshots (
    restaurant_id, date, total_customers, new_customers, returning_customers,
    points_issued, rewards_redeemed, revenue_impact, tier_distribution, popular_rewards
  ) VALUES (
    target_restaurant_id, target_date, total_customers_count, new_customers_count,
    returning_customers_count, points_issued_count, rewards_redeemed_count,
    revenue_impact_amount, tier_dist, popular_rewards_data
  )
  ON CONFLICT (restaurant_id, date) 
  DO UPDATE SET
    total_customers = EXCLUDED.total_customers,
    new_customers = EXCLUDED.new_customers,
    returning_customers = EXCLUDED.returning_customers,
    points_issued = EXCLUDED.points_issued,
    rewards_redeemed = EXCLUDED.rewards_redeemed,
    revenue_impact = EXCLUDED.revenue_impact,
    tier_distribution = EXCLUDED.tier_distribution,
    popular_rewards = EXCLUDED.popular_rewards,
    created_at = now();
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(restaurant_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(current_tier);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_restaurant_date ON transactions(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_redemptions_restaurant_date ON redemptions(restaurant_id, redeemed_at);
CREATE INDEX IF NOT EXISTS idx_analytics_restaurant_date ON analytics_snapshots(restaurant_id, date);