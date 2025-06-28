import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Add connection validation
const validateSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('restaurants').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    return false;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test connection on initialization
validateSupabaseConnection().then(isConnected => {
  if (!isConnected) {
    console.warn('Supabase connection failed. Please check your environment variables and project status.');
  }
});

// Database types
export interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  settings: any;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  total_points: number;
  lifetime_points: number;
  current_tier: 'bronze' | 'silver' | 'gold';
  tier_progress: number;
  last_visit?: string;
  visit_count: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  restaurant_id: string;
  customer_id: string;
  type: 'purchase' | 'bonus' | 'referral' | 'signup';
  points: number;
  amount_spent?: number;
  description?: string;
  reference_id?: string;
  created_at: string;
  customer?: Customer;
}

export interface Reward {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  points_required: number;
  category: string;
  image_url?: string;
  terms_conditions?: string;
  max_redemptions_per_customer?: number;
  total_available?: number;
  total_redeemed: number;
  min_tier: 'bronze' | 'silver' | 'gold';
  is_active: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reward_id: string;
  points_used: number;
  status: string;
  redeemed_at: string;
  used_at?: string;
  staff_id?: string;
  notes?: string;
  customer?: Customer;
  reward?: Reward;
}

export interface Staff {
  id: string;
  restaurant_id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'manager' | 'staff' | 'admin';
  permissions: string[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  restaurant_id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  is_read: boolean;
  metadata: any;
  created_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  restaurant_id: string;
  date: string;
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  points_issued: number;
  rewards_redeemed: number;
  revenue_impact: number;
  avg_transaction_value: number;
  customer_retention_rate: number;
  tier_distribution: {
    bronze: number;
    silver: number;
    gold: number;
  };
  popular_rewards: Array<{
    name: string;
    redemptions: number;
  }>;
  created_at: string;
}