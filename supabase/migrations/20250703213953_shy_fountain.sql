/*
  # Fix Restaurant Insert Policy for New User Registration

  1. Policy Changes
    - Update the restaurant insert policy to allow authenticated users to create restaurants
    - Ensure users can only create restaurants with their own email address
    - This fixes the RLS violation that occurs when new users try to create their first restaurant

  2. Security
    - Maintains security by ensuring users can only create restaurants with their own email
    - Uses auth.email() to verify the email matches the authenticated user's email
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "restaurants_insert_policy" ON restaurants;

-- Create a new insert policy that allows users to create restaurants with their own email
CREATE POLICY "restaurants_insert_policy" 
  ON restaurants 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.email() = email
  );