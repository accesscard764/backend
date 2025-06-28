/*
  # Clean Production Data - Remove All Mock/Dummy Data

  1. Data Cleanup
    - Remove all dummy customers (Emily Davis, Mike Chen, etc.)
    - Remove all mock transactions and redemptions
    - Remove dummy analytics snapshots
    - Keep only essential restaurant and staff data

  2. Fresh Start
    - Clean slate for real customer data
    - No pre-populated charts or statistics
    - Only authentic real-time data from actual signups

  3. Production Ready
    - Remove test notifications
    - Clean analytics tables
    - Reset counters and totals
*/

-- Remove all dummy customers and their related data
DELETE FROM redemptions WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';
DELETE FROM transactions WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';
DELETE FROM customers WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove all mock analytics data
DELETE FROM analytics_snapshots WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove test notifications
DELETE FROM notifications WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Reset reward redemption counters
UPDATE rewards 
SET total_redeemed = 0, updated_at = now()
WHERE restaurant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Remove SecureDevo test data as well
DELETE FROM redemptions WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM transactions WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM customers WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM analytics_snapshots WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM notifications WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM rewards WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM loyalty_tiers WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM staff WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM restaurants WHERE id = '11111111-1111-1111-1111-111111111111';

-- Keep only the main restaurant and staff for adnan@securedevo.com
-- All customer data will now come from real signups through the customer wallet