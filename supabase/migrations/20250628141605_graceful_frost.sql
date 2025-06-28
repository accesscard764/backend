/*
  # Fix Authentication and User Creation Issues

  1. Database Setup
    - Ensure proper RLS policies for auth.users access
    - Fix staff table policies for user creation
    - Add proper indexes and constraints

  2. Security
    - Update RLS policies to handle user creation flow
    - Ensure staff records can be linked to auth users
    - Add proper error handling for edge cases

  3. User Management
    - Create function to handle user-staff linking
    - Add triggers for automatic linking
    - Ensure data consistency
*/

-- Ensure the staff table has proper policies for user creation
DROP POLICY IF EXISTS "Users can access staff record by email for linking" ON staff;
DROP POLICY IF EXISTS "Users can update their own staff user_id" ON staff;

-- Create a more permissive policy for initial user setup
CREATE POLICY "Users can access staff record by email for linking"
  ON staff
  FOR SELECT
  TO authenticated
  USING (auth.email() = email AND user_id IS NULL);

-- Allow users to update their staff record during linking
CREATE POLICY "Users can update their own staff user_id"
  ON staff
  FOR UPDATE
  TO authenticated
  USING (auth.email() = email)
  WITH CHECK (auth.uid() = user_id);

-- Create or replace the user linking function with better error handling
CREATE OR REPLACE FUNCTION link_auth_user_to_staff()
RETURNS TRIGGER AS $$
DECLARE
  staff_record RECORD;
BEGIN
  -- Find staff record by email
  SELECT * INTO staff_record
  FROM staff 
  WHERE email = NEW.email 
  AND user_id IS NULL;
  
  -- If staff record exists, link it to the new user
  IF FOUND THEN
    UPDATE staff 
    SET user_id = NEW.id, 
        last_login = now(),
        updated_at = now()
    WHERE email = NEW.email 
    AND user_id IS NULL;
    
    RAISE NOTICE 'Successfully linked user % to staff record', NEW.email;
  ELSE
    RAISE NOTICE 'No unlinked staff record found for user %', NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error linking user % to staff: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_auth_user_to_staff();

-- Also handle email confirmation updates
CREATE OR REPLACE FUNCTION link_auth_user_to_staff_on_update()
RETURNS TRIGGER AS $$
DECLARE
  staff_record RECORD;
BEGIN
  -- Only process if email was confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Find staff record by email
    SELECT * INTO staff_record
    FROM staff 
    WHERE email = NEW.email 
    AND user_id IS NULL;
    
    -- If staff record exists, link it to the user
    IF FOUND THEN
      UPDATE staff 
      SET user_id = NEW.id, 
          last_login = now(),
          updated_at = now()
      WHERE email = NEW.email 
      AND user_id IS NULL;
      
      RAISE NOTICE 'Successfully linked confirmed user % to staff record', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error linking confirmed user % to staff: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_auth_user_to_staff_on_update();

-- Ensure the main staff record exists and is properly configured
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

-- Link any existing auth users to staff records
DO $$
DECLARE
  auth_user_record RECORD;
  staff_record RECORD;
BEGIN
  -- Find any auth users that match our staff emails but aren't linked
  FOR auth_user_record IN 
    SELECT au.id, au.email 
    FROM auth.users au
    WHERE au.email IS NOT NULL
  LOOP
    -- Check if there's an unlinked staff record for this email
    SELECT * INTO staff_record
    FROM staff s 
    WHERE s.email = auth_user_record.email 
    AND s.user_id IS NULL;
    
    IF FOUND THEN
      UPDATE staff 
      SET user_id = auth_user_record.id,
          last_login = now(),
          updated_at = now()
      WHERE email = auth_user_record.email
      AND user_id IS NULL;
      
      RAISE NOTICE 'Linked existing user % to staff record', auth_user_record.email;
    END IF;
  END LOOP;
END $$;

-- Add some helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_email_user_id ON staff(email, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id) WHERE user_id IS NOT NULL;

-- Ensure proper permissions on the staff table
GRANT SELECT, UPDATE ON staff TO authenticated;