import { supabase } from '../lib/supabase';
import type { Customer, Transaction } from '../lib/supabase';

export interface CreateCustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  restaurant_id?: string; // Add restaurant ID for direct linking
}

export class CustomerService {
  // Get current restaurant ID (for manager dashboard)
  private static async getCurrentRestaurantId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data: staff, error } = await supabase
      .from('staff')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (error || !staff) {
      throw new Error('Staff record not found. Please contact support.');
    }

    return staff.restaurant_id;
  }

  // Get restaurant info by ID (for customer onboarding)
  static async getRestaurantInfo(restaurantId: string): Promise<{ id: string; name: string; logo_url?: string }> {
    try {
      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('id, name, logo_url')
        .eq('id', restaurantId)
        .single();

      if (error || !restaurant) {
        throw new Error('Restaurant not found');
      }

      return restaurant;
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
      throw error;
    }
  }

  // Check if customer already exists by email OR phone
  static async checkCustomerExists(
    email: string, 
    phone?: string, 
    restaurantId?: string
  ): Promise<Customer | null> {
    try {
      // If restaurant ID is provided (from QR code), check within that restaurant
      // Otherwise, check within current user's restaurant (for manager dashboard)
      const targetRestaurantId = restaurantId || await this.getCurrentRestaurantId();

      // Build query conditions for specific restaurant
      let query = supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', targetRestaurantId)
        .eq('is_active', true);

      // Check by email OR phone (if both provided)
      if (phone && phone.trim() !== '') {
        query = query.or(`email.eq.${email},phone.eq.${phone}`);
      } else {
        query = query.eq('email', email);
      }

      const { data: customers, error } = await query;

      if (error) {
        console.error('Error checking customer existence:', error);
        throw error;
      }

      // Return the first matching customer (if any)
      return customers && customers.length > 0 ? customers[0] : null;
    } catch (error) {
      console.error('Error checking customer existence:', error);
      throw error;
    }
  }

  // Find customer by email or phone for login
  static async findCustomerForLogin(
    emailOrPhone: string, 
    restaurantId?: string
  ): Promise<Customer | null> {
    try {
      // If restaurant ID is provided (from QR code), search within that restaurant
      // Otherwise, search within current user's restaurant (for manager dashboard)
      const targetRestaurantId = restaurantId || await this.getCurrentRestaurantId();

      // Try to find by email first, then by phone for specific restaurant
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', targetRestaurantId)
        .eq('is_active', true)
        .or(`email.eq.${emailOrPhone},phone.eq.${emailOrPhone}`);

      if (error) {
        console.error('Error finding customer for login:', error);
        throw error;
      }

      return customers && customers.length > 0 ? customers[0] : null;
    } catch (error) {
      console.error('Error finding customer for login:', error);
      throw error;
    }
  }

  // Create a new customer
  static async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
    try {
      // Use provided restaurant ID or get current user's restaurant ID
      const restaurantId = customerData.restaurant_id || await this.getCurrentRestaurantId();

      // Check if customer already exists in the target restaurant
      const existingCustomer = await this.checkCustomerExists(
        customerData.email, 
        customerData.phone, 
        restaurantId
      );
      
      if (existingCustomer) {
        throw new Error('A customer with this email or phone number already exists in this restaurant');
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          restaurant_id: restaurantId,
          first_name: customerData.first_name,
          last_name: customerData.last_name,
          email: customerData.email,
          phone: customerData.phone,
          date_of_birth: customerData.date_of_birth,
          total_points: 100, // Welcome bonus
          lifetime_points: 100,
          current_tier: 'bronze',
          tier_progress: 0,
          visit_count: 0,
          total_spent: 0,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Create welcome bonus transaction
      await supabase
        .from('transactions')
        .insert({
          restaurant_id: restaurantId,
          customer_id: customer.id,
          type: 'signup',
          points: 100,
          description: 'Welcome bonus for joining our loyalty program'
        });

      // Create notification for new customer signup (only if this is from manager dashboard)
      if (!customerData.restaurant_id) {
        await supabase
          .from('notifications')
          .insert({
            restaurant_id: restaurantId,
            title: 'New Customer Signup',
            message: `${customer.first_name} ${customer.last_name} has joined your loyalty program`,
            type: 'success'
          });
      }

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // Get customer by ID (must belong to current restaurant)
  static async getCustomer(customerId: string): Promise<Customer> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error) throw error;
      return customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  // Get all customers for current restaurant
  static async getCustomers(): Promise<Customer[]> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return customers || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  // Get customer transactions (must belong to current restaurant)
  static async getCustomerTransactions(customerId: string): Promise<Transaction[]> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return transactions || [];
    } catch (error) {
      console.error('Error fetching customer transactions:', error);
      throw error;
    }
  }

  // Add points to customer (must belong to current restaurant)
  static async addPoints(customerId: string, points: number, description?: string, amountSpent?: number): Promise<void> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      // Get current customer data (verify it belongs to current restaurant)
      const customer = await this.getCustomer(customerId);

      // Calculate new totals
      const newTotalPoints = customer.total_points + points;
      const newLifetimePoints = customer.lifetime_points + points;
      const newTotalSpent = customer.total_spent + (amountSpent || 0);
      const newVisitCount = customer.visit_count + (amountSpent ? 1 : 0);

      // Determine new tier
      let newTier = customer.current_tier;
      let tierProgress = 0;

      if (newLifetimePoints >= 1000) {
        newTier = 'gold';
        tierProgress = 100;
      } else if (newLifetimePoints >= 500) {
        newTier = 'silver';
        tierProgress = Math.round(((newLifetimePoints - 500) / 500) * 100);
      } else {
        newTier = 'bronze';
        tierProgress = Math.round((newLifetimePoints / 500) * 100);
      }

      // Update customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          total_points: newTotalPoints,
          lifetime_points: newLifetimePoints,
          current_tier: newTier,
          tier_progress: Math.min(tierProgress, 100),
          total_spent: newTotalSpent,
          visit_count: newVisitCount,
          last_visit: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('restaurant_id', restaurantId);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          restaurant_id: restaurantId,
          customer_id: customerId,
          type: 'purchase',
          points: points,
          amount_spent: amountSpent,
          description: description || 'Points earned from purchase'
        });

      if (transactionError) throw transactionError;

      // Check for tier upgrade and create notification
      if (newTier !== customer.current_tier) {
        await supabase
          .from('notifications')
          .insert({
            restaurant_id: restaurantId,
            title: 'Tier Upgrade',
            message: `${customer.first_name} ${customer.last_name} has been upgraded to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} tier`,
            type: 'success'
          });
      }

    } catch (error) {
      console.error('Error adding points:', error);
      throw error;
    }
  }

  // Search customers (current restaurant only)
  static async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return customers || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  // Generate QR code URL for restaurant
  static generateQRCodeURL(restaurantId: string): string {
    const baseURL = window.location.origin;
    return `${baseURL}/wallet?restaurant=${restaurantId}`;
  }

  // Parse restaurant ID from URL
  static getRestaurantIdFromURL(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('restaurant');
  }
}