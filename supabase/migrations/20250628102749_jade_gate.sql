/*
  # Fix Staff Table RLS Policy

  1. Problem
    - Current staff table policy causes infinite recursion
    - Policy queries staff table from within staff table policy
    - Creates circular reference when checking permissions

  2. Solution
    - Drop the problematic policy
    - Create a new policy that directly checks user_id without subqueries
    - Add a separate policy for email-based access during user linking

  3. Security
    - Users can only access their own staff record
    - Maintains data isolation between restaurants
    - Allows for user_id linking process
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Staff can access their restaurant's staff" ON staff;

-- Create a simple policy that allows users to access their own staff record
CREATE POLICY "Users can access their own staff record"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a policy to allow access by email for user linking process
-- This is needed when a user signs in but their staff record doesn't have user_id set yet
CREATE POLICY "Users can access staff record by email for linking"
  ON staff
  FOR SELECT
  TO authenticated
  USING (auth.email() = email AND user_id IS NULL);

-- Create a policy to allow updating user_id for linking process
CREATE POLICY "Users can update their own staff user_id"
  ON staff
  FOR UPDATE
  TO authenticated
  USING (auth.email() = email)
  WITH CHECK (auth.uid() = user_id);