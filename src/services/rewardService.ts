import { supabase } from '../lib/supabase';
import type { Reward, Redemption } from '../lib/supabase';

export class RewardService {
  // Get current restaurant ID
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

  // Get available rewards for a customer (current restaurant only)
  static async getAvailableRewards(customerId: string): Promise<Reward[]> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      // Verify customer belongs to current restaurant
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (customerError || !customer) {
        throw new Error('Customer not found in your restaurant');
      }

      const { data: rewards, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('points_required', { ascending: true });

      if (error) throw error;
      return rewards || [];
    } catch (error) {
      console.error('Error fetching rewards:', error);
      throw error;
    }
  }

  // Get all rewards for current restaurant
  static async getRewards(): Promise<Reward[]> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: rewards, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return rewards || [];
    } catch (error) {
      console.error('Error fetching rewards:', error);
      throw error;
    }
  }

  // Redeem a reward (current restaurant only)
  static async redeemReward(customerId: string, rewardId: string): Promise<Redemption> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      // Get customer and reward data (verify they belong to current restaurant)
      const [customerResponse, rewardResponse] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId).eq('restaurant_id', restaurantId).single(),
        supabase.from('rewards').select('*').eq('id', rewardId).eq('restaurant_id', restaurantId).single()
      ]);

      if (customerResponse.error) throw new Error('Customer not found in your restaurant');
      if (rewardResponse.error) throw new Error('Reward not found in your restaurant');

      const customer = customerResponse.data;
      const reward = rewardResponse.data;

      // Validate redemption
      if (customer.total_points < reward.points_required) {
        throw new Error('Insufficient points');
      }

      // Check tier requirement
      const tierOrder = { bronze: 0, silver: 1, gold: 2 };
      if (tierOrder[customer.current_tier] < tierOrder[reward.min_tier]) {
        throw new Error(`Requires ${reward.min_tier} tier or higher`);
      }

      // Check availability
      if (reward.total_available && reward.total_redeemed >= reward.total_available) {
        throw new Error('Reward is no longer available');
      }

      // Create redemption
      const { data: redemption, error: redemptionError } = await supabase
        .from('redemptions')
        .insert({
          restaurant_id: restaurantId,
          customer_id: customerId,
          reward_id: rewardId,
          points_used: reward.points_required,
          status: 'pending'
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      // Update customer points
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          total_points: customer.total_points - reward.points_required,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('restaurant_id', restaurantId);

      if (customerUpdateError) throw customerUpdateError;

      // Update reward redemption count
      const { error: rewardUpdateError } = await supabase
        .from('rewards')
        .update({
          total_redeemed: reward.total_redeemed + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', rewardId)
        .eq('restaurant_id', restaurantId);

      if (rewardUpdateError) throw rewardUpdateError;

      // Create notification for reward redemption
      await supabase
        .from('notifications')
        .insert({
          restaurant_id: restaurantId,
          title: 'Reward Redeemed',
          message: `${customer.first_name} ${customer.last_name} redeemed ${reward.name}`,
          type: 'info'
        });

      return redemption;
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  // Get redemptions for current restaurant
  static async getRedemptions(): Promise<Redemption[]> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: redemptions, error } = await supabase
        .from('redemptions')
        .select(`
          *,
          customer:customers(first_name, last_name, email),
          reward:rewards(name, description)
        `)
        .eq('restaurant_id', restaurantId)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;
      return redemptions || [];
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      throw error;
    }
  }

  // Create a new reward for current restaurant
  static async createReward(rewardData: Partial<Reward>): Promise<Reward> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: reward, error } = await supabase
        .from('rewards')
        .insert({
          restaurant_id: restaurantId,
          ...rewardData,
          total_redeemed: 0,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return reward;
    } catch (error) {
      console.error('Error creating reward:', error);
      throw error;
    }
  }

  // Update reward (current restaurant only)
  static async updateReward(rewardId: string, updates: Partial<Reward>): Promise<Reward> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: reward, error } = await supabase
        .from('rewards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', rewardId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single();

      if (error) throw error;
      return reward;
    } catch (error) {
      console.error('Error updating reward:', error);
      throw error;
    }
  }

  // Delete reward (current restaurant only)
  static async deleteReward(rewardId: string): Promise<void> {
    try {
      const restaurantId = await this.getCurrentRestaurantId();

      const { error } = await supabase
        .from('rewards')
        .update({ is_active: false })
        .eq('id', rewardId)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting reward:', error);
      throw error;
    }
  }
}