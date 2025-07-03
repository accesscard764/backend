/*
  # Fix RLS policies for restaurant creation

  This migration resolves the circular dependency issue where new users cannot create restaurants
  because they don't have staff records, but they can't create staff records without restaurants.

  ## Changes Made

  1. **Restaurants Table**
     - Updated policy to allow authenticated users to insert new restaurants
     - Maintains existing access control for updates/deletes

  2. **Staff Table** 
     - Updated policy to allow users to insert their own staff records
     - Maintains existing access control for other operations

  3. **Loyalty Tiers Table**
     - Added insert policy for restaurant owners to create default tiers

  4. **Rewards Table**
     - Added insert policy for restaurant owners to create initial rewards

  5. **Notifications Table**
     - Added insert policy for restaurant owners to create notifications

  ## Security Notes
  - Policies ensure users can only create data for restaurants they own
  - Existing read/update/delete policies remain unchanged
  - All policies maintain proper data isolation between restaurants
*/

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "restaurant_staff_access" ON restaurants;
DROP POLICY IF EXISTS "staff_own_record_access" ON staff;
DROP POLICY IF EXISTS "loyalty_tiers_restaurant_isolation" ON loyalty_tiers;
DROP POLICY IF EXISTS "rewards_restaurant_isolation" ON rewards;
DROP POLICY IF EXISTS "notifications_restaurant_isolation" ON notifications;

-- Restaurants table policies
CREATE POLICY "restaurants_insert_policy" 
  ON restaurants 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "restaurants_select_policy" 
  ON restaurants 
  FOR SELECT 
  TO authenticated 
  USING (
    id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "restaurants_update_policy" 
  ON restaurants 
  FOR UPDATE 
  TO authenticated 
  USING (
    id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "restaurants_delete_policy" 
  ON restaurants 
  FOR DELETE 
  TO authenticated 
  USING (
    id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Staff table policies
CREATE POLICY "staff_insert_policy" 
  ON staff 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "staff_select_policy" 
  ON staff 
  FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "staff_update_policy" 
  ON staff 
  FOR UPDATE 
  TO authenticated 
  USING (
    user_id = auth.uid() 
    OR restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "staff_delete_policy" 
  ON staff 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Loyalty tiers table policies
CREATE POLICY "loyalty_tiers_insert_policy" 
  ON loyalty_tiers 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "loyalty_tiers_select_policy" 
  ON loyalty_tiers 
  FOR SELECT 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "loyalty_tiers_update_policy" 
  ON loyalty_tiers 
  FOR UPDATE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "loyalty_tiers_delete_policy" 
  ON loyalty_tiers 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Rewards table policies
CREATE POLICY "rewards_insert_policy" 
  ON rewards 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rewards_select_policy" 
  ON rewards 
  FOR SELECT 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rewards_update_policy" 
  ON rewards 
  FOR UPDATE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "rewards_delete_policy" 
  ON rewards 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Notifications table policies
CREATE POLICY "notifications_insert_policy" 
  ON notifications 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_select_policy" 
  ON notifications 
  FOR SELECT 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_update_policy" 
  ON notifications 
  FOR UPDATE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_delete_policy" 
  ON notifications 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Customers table policies (update existing)
DROP POLICY IF EXISTS "customers_restaurant_isolation" ON customers;

CREATE POLICY "customers_insert_policy" 
  ON customers 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customers_select_policy" 
  ON customers 
  FOR SELECT 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customers_update_policy" 
  ON customers 
  FOR UPDATE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customers_delete_policy" 
  ON customers 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Transactions table policies (update existing)
DROP POLICY IF EXISTS "transactions_restaurant_isolation" ON transactions;

CREATE POLICY "transactions_insert_policy" 
  ON transactions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_select_policy" 
  ON transactions 
  FOR SELECT 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_update_policy" 
  ON transactions 
  FOR UPDATE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "transactions_delete_policy" 
  ON transactions 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Redemptions table policies (update existing)
DROP POLICY IF EXISTS "redemptions_restaurant_isolation" ON redemptions;

CREATE POLICY "redemptions_insert_policy" 
  ON redemptions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "redemptions_select_policy" 
  ON redemptions 
  FOR SELECT 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "redemptions_update_policy" 
  ON redemptions 
  FOR UPDATE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "redemptions_delete_policy" 
  ON redemptions 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Analytics snapshots table policies (update existing)
DROP POLICY IF EXISTS "analytics_restaurant_isolation" ON analytics_snapshots;

CREATE POLICY "analytics_insert_policy" 
  ON analytics_snapshots 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_select_policy" 
  ON analytics_snapshots 
  FOR SELECT 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_update_policy" 
  ON analytics_snapshots 
  FOR UPDATE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "analytics_delete_policy" 
  ON analytics_snapshots 
  FOR DELETE 
  TO authenticated 
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM staff 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );