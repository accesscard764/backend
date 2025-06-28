-- Ensure the staff record exists for adnan@securedevo.com
INSERT INTO staff (restaurant_id, email, first_name, last_name, role, permissions) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'adnan@securedevo.com', 'Adnan', 'SecureDevo', 'manager', 
'["manage_customers", "manage_rewards", "view_analytics", "manage_staff", "manage_settings", "export_data", "manage_billing"]')
ON CONFLICT (restaurant_id, email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  updated_at = now();

-- Create or replace function to automatically link auth users to staff records
CREATE OR REPLACE FUNCTION link_auth_user_to_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- Update staff record with the new user_id when a user signs up
  UPDATE staff 
  SET user_id = NEW.id, 
      last_login = now(),
      updated_at = now()
  WHERE email = NEW.email 
  AND user_id IS NULL;
  
  -- Log the linking attempt
  RAISE NOTICE 'Attempted to link user % to staff record', NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_auth_user_to_staff();

-- Also create a trigger for when users are updated (in case email confirmation happens later)
CREATE OR REPLACE FUNCTION link_auth_user_to_staff_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update staff record when user is confirmed or updated
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE staff 
    SET user_id = NEW.id, 
        last_login = now(),
        updated_at = now()
    WHERE email = NEW.email 
    AND user_id IS NULL;
    
    RAISE NOTICE 'Linked confirmed user % to staff record', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_auth_user_to_staff_on_update();

-- Update any existing user that might already be in the system
DO $$
DECLARE
  auth_user_record RECORD;
BEGIN
  -- Find any auth users that match our staff emails but aren't linked
  FOR auth_user_record IN 
    SELECT au.id, au.email 
    FROM auth.users au
    JOIN staff s ON s.email = au.email
    WHERE s.user_id IS NULL
  LOOP
    UPDATE staff 
    SET user_id = auth_user_record.id,
        last_login = now(),
        updated_at = now()
    WHERE email = auth_user_record.email;
    
    RAISE NOTICE 'Linked existing user % to staff record', auth_user_record.email;
  END LOOP;
END $$;