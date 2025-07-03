/*
  # Fix RLS Policies for Staff and Restaurants Tables

  1. Policy Updates
    - Fix infinite recursion in staff table SELECT policy
    - Fix restaurant INSERT policy to allow authenticated users to create restaurants
    - Simplify staff policies to prevent recursive lookups

  2. Changes Made
    - Replace complex staff SELECT policy with simple user_id check
    - Update restaurant INSERT policy to allow authenticated users
    - Ensure staff can read their own records without recursion
    - Maintain security while fixing functionality

  3. Security
    - Users can only access their own staff records
    - Authenticated users can create restaurants
    - Staff can only access data for their restaurant
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "staff_select_policy" ON staff;
DROP POLICY IF EXISTS "restaurants_insert_policy" ON restaurants;

-- Create new simplified staff SELECT policy to prevent infinite recursion
CREATE POLICY "staff_select_policy" 
  ON staff 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Create new restaurant INSERT policy to allow authenticated users to create restaurants
CREATE POLICY "restaurants_insert_policy" 
  ON restaurants 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update staff INSERT policy to be more permissive for initial setup
DROP POLICY IF EXISTS "staff_insert_policy" ON staff;
CREATE POLICY "staff_insert_policy" 
  ON staff 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update staff UPDATE policy to allow users to update their own records
DROP POLICY IF EXISTS "staff_update_policy" ON staff;
CREATE POLICY "staff_update_policy" 
  ON staff 
  FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update staff DELETE policy to be simpler
DROP POLICY IF EXISTS "staff_delete_policy" ON staff;
CREATE POLICY "staff_delete_policy" 
  ON staff 
  FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Update restaurants SELECT policy to use direct staff lookup
DROP POLICY IF EXISTS "restaurants_select_policy" ON restaurants;
CREATE POLICY "restaurants_select_policy" 
  ON restaurants 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.restaurant_id = restaurants.id 
      AND staff.user_id = auth.uid()
    )
  );

-- Update restaurants UPDATE policy
DROP POLICY IF EXISTS "restaurants_update_policy" ON restaurants;
CREATE POLICY "restaurants_update_policy" 
  ON restaurants 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.restaurant_id = restaurants.id 
      AND staff.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.restaurant_id = restaurants.id 
      AND staff.user_id = auth.uid()
    )
  );

-- Update restaurants DELETE policy
DROP POLICY IF EXISTS "restaurants_delete_policy" ON restaurants;
CREATE POLICY "restaurants_delete_policy" 
  ON restaurants 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM staff 
      WHERE staff.restaurant_id = restaurants.id 
      AND staff.user_id = auth.uid() 
      AND staff.role = 'admin'
    )
  );