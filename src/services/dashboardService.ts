import { supabase } from '../lib/supabase';
import type { 
  Customer, 
  Transaction, 
  Redemption, 
  AnalyticsSnapshot, 
  Notification,
  Reward,
  Staff 
} from '../lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export class DashboardService {
  // Get current user's restaurant ID
  private static async getCurrentRestaurantId(): Promise<string | null> {
    try {
      console.log('🏢 Getting current restaurant ID...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        throw new Error('No authenticated user');
      }

      console.log('👤 Current user:', user.email);

      // Test database connection first
      const { data: testConnection, error: connectionError } = await supabase
        .from('staff')
        .select('restaurant_id')
        .limit(1);

      if (connectionError) {
        console.error('❌ Database connection error:', connectionError);
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }

      console.log('✅ Database connection successful');

      // Try to find by user_id first
      const { data: staff, error } = await supabase
        .from('staff')
        .select('restaurant_id, first_name, last_name, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching staff by user_id:', error);
        throw new Error(`Staff lookup failed: ${error.message}`);
      }

      if (staff) {
        console.log('✅ Staff data found:', staff.first_name, staff.last_name, staff.role);
        console.log('✅ Restaurant ID:', staff.restaurant_id);
        return staff.restaurant_id;
      }

      // If no staff record found, this means the user doesn't have a restaurant setup
      console.log('❌ No staff record found for user');
      throw new Error('No staff record found for user');
    } catch (error) {
      console.error('❌ Error getting restaurant ID:', error);
      throw error;
    }
  }

  // Get dashboard statistics with real-time data
  static async getDashboardStats(timeRange: string = '7d') {
    try {
      console.log('📊 Fetching real-time dashboard stats...');
      
      const restaurantId = await this.getCurrentRestaurantId();
      console.log('🏢 Fetching stats for restaurant:', restaurantId);

      const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const previousStartDate = format(subDays(new Date(), days * 2), 'yyyy-MM-dd');
      const previousEndDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      // Get current period data with real-time queries
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);

      if (customersError) {
        console.error('❌ Error fetching customers:', customersError);
        throw new Error(`Failed to fetch customers: ${customersError.message}`);
      }

      const { data: currentTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('points, amount_spent, created_at, type')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate);

      if (transactionsError) {
        console.error('❌ Error fetching transactions:', transactionsError);
        throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
      }

      const { data: currentRedemptions, error: redemptionsError } = await supabase
        .from('redemptions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('redeemed_at', startDate);

      if (redemptionsError) {
        console.error('❌ Error fetching redemptions:', redemptionsError);
        throw new Error(`Failed to fetch redemptions: ${redemptionsError.message}`);
      }

      // Get previous period data for comparison
      const { data: previousTransactions } = await supabase
        .from('transactions')
        .select('points, amount_spent, created_at')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', previousStartDate)
        .lt('created_at', previousEndDate);

      const { data: previousRedemptions } = await supabase
        .from('redemptions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('redeemed_at', previousStartDate)
        .lt('redeemed_at', previousEndDate);

      // Calculate current metrics
      const totalCustomers = customers?.length || 0;
      const pointsIssued = currentTransactions?.reduce((sum, t) => sum + (t.points || 0), 0) || 0;
      const rewardsRedeemed = currentRedemptions?.length || 0;
      const revenueImpact = currentTransactions?.reduce((sum, t) => sum + (t.amount_spent || 0), 0) || 0;

      // Calculate previous metrics
      const previousPointsIssued = previousTransactions?.reduce((sum, t) => sum + (t.points || 0), 0) || 0;
      const previousRewardsRedeemed = previousRedemptions?.length || 0;
      const previousRevenueImpact = previousTransactions?.reduce((sum, t) => sum + (t.amount_spent || 0), 0) || 0;

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '+100%' : '0%';
        const change = ((current - previous) / previous) * 100;
        return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      };

      // Calculate new customers in current period
      const newCustomersCount = customers?.filter(c => {
        const createdDate = new Date(c.created_at);
        const startDateObj = new Date(startDate);
        return createdDate >= startDateObj;
      }).length || 0;

      const stats = [
        {
          name: 'Total Customers',
          value: totalCustomers.toLocaleString(),
          change: newCustomersCount > 0 ? `+${newCustomersCount} new` : '0 new',
          trend: newCustomersCount > 0 ? 'up' as const : 'down' as const,
          description: 'Active loyalty members'
        },
        {
          name: 'Points Issued',
          value: pointsIssued > 1000 ? `${(pointsIssued / 1000).toFixed(1)}K` : pointsIssued.toString(),
          change: calculateChange(pointsIssued, previousPointsIssued),
          trend: pointsIssued >= previousPointsIssued ? 'up' as const : 'down' as const,
          description: `Last ${days} days`
        },
        {
          name: 'Rewards Claimed',
          value: rewardsRedeemed.toString(),
          change: calculateChange(rewardsRedeemed, previousRewardsRedeemed),
          trend: rewardsRedeemed >= previousRewardsRedeemed ? 'up' as const : 'down' as const,
          description: `Last ${days} days`
        },
        {
          name: 'Revenue Impact',
          value: `$${revenueImpact.toLocaleString()}`,
          change: calculateChange(revenueImpact, previousRevenueImpact),
          trend: revenueImpact >= previousRevenueImpact ? 'up' as const : 'down' as const,
          description: `Last ${days} days`
        }
      ];

      console.log('✅ Real-time dashboard stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Get recent customer activity with real-time updates
  static async getRecentActivity(limit: number = 10) {
    try {
      console.log('📋 Fetching real-time recent activity...');
      
      const restaurantId = await this.getCurrentRestaurantId();
      console.log('🏢 Fetching activity for restaurant:', restaurantId);

      // Get recent transactions with customer data
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:customers(first_name, last_name, current_tier)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (transactionsError) {
        console.error('❌ Error fetching transactions:', transactionsError);
        throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
      }

      // Get recent redemptions with customer and reward data
      const { data: redemptions, error: redemptionsError } = await supabase
        .from('redemptions')
        .select(`
          *,
          customer:customers(first_name, last_name, current_tier),
          reward:rewards(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('redeemed_at', { ascending: false })
        .limit(limit);

      if (redemptionsError) {
        console.error('❌ Error fetching redemptions:', redemptionsError);
        throw new Error(`Failed to fetch redemptions: ${redemptionsError.message}`);
      }

      // Combine and sort activities by timestamp
      const activities = [
        ...(transactions?.map(t => ({
          id: `t-${t.id}`,
          customer: `${t.customer?.first_name || 'Unknown'} ${t.customer?.last_name || 'Customer'}`,
          action: t.type === 'signup' ? 'Signed up' : 
                  t.type === 'bonus' ? 'Received bonus' :
                  t.type === 'referral' ? 'Referral bonus' :
                  'Earned points',
          reward: null,
          time: this.formatTimeAgo(t.created_at),
          points: t.points,
          tier: t.customer?.current_tier || 'bronze',
          avatar: `${t.customer?.first_name?.[0] || 'U'}${t.customer?.last_name?.[0] || 'C'}`,
          timestamp: new Date(t.created_at).getTime()
        })) || []),
        ...(redemptions?.map(r => ({
          id: `r-${r.id}`,
          customer: `${r.customer?.first_name || 'Unknown'} ${r.customer?.last_name || 'Customer'}`,
          action: 'Redeemed reward',
          reward: r.reward?.name || 'Unknown Reward',
          time: this.formatTimeAgo(r.redeemed_at),
          points: -r.points_used, // Negative for redemptions
          tier: r.customer?.current_tier || 'bronze',
          avatar: `${r.customer?.first_name?.[0] || 'U'}${r.customer?.last_name?.[0] || 'C'}`,
          timestamp: new Date(r.redeemed_at).getTime()
        })) || [])
      ];

      const sortedActivities = activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      console.log('✅ Real-time recent activities fetched:', sortedActivities.length);
      return sortedActivities;
    } catch (error) {
      console.error('❌ Error fetching recent activity:', error);
      throw error;
    }
  }

  // Get customer growth data with real-time analytics
  static async getCustomerGrowthData(timeRange: string = '7d') {
    try {
      console.log('📈 Fetching real-time customer growth data...');
      
      const restaurantId = await this.getCurrentRestaurantId();
      const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
      
      // Generate real-time data from actual customer records
      const customerData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get customers created up to this date
        const { data: customersUpToDate } = await supabase
          .from('customers')
          .select('created_at')
          .eq('restaurant_id', restaurantId)
          .lte('created_at', format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss'));

        // Get customers who had transactions on this date (returning customers)
        const { data: returningCustomers } = await supabase
          .from('transactions')
          .select('customer_id')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', format(startOfDay(date), 'yyyy-MM-dd HH:mm:ss'))
          .lte('created_at', format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss'));

        customerData.push({
          date: format(date, 'MMM dd'),
          customers: customersUpToDate?.length || 0,
          returning: returningCustomers?.length || 0
        });
      }
      
      console.log('✅ Customer growth data fetched:', customerData.length, 'data points');
      return customerData;
    } catch (error) {
      console.error('❌ Error fetching customer growth data:', error);
      throw error;
    }
  }

  // Get reward distribution data with real-time updates
  static async getRewardDistribution() {
    try {
      console.log('🎁 Fetching real-time reward distribution...');
      
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: rewards, error } = await supabase
        .from('rewards')
        .select('name, total_redeemed, category')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('total_redeemed', { ascending: false })
        .limit(6);

      if (error) {
        console.error('❌ Error fetching rewards:', error);
        throw new Error(`Failed to fetch rewards: ${error.message}`);
      }

      if (!rewards || rewards.length === 0) {
        console.log('⚠️ No rewards data found');
        return [];
      }

      const colors = ['#1E2A78', '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'];
      const total = rewards.reduce((sum, r) => sum + r.total_redeemed, 0);

      const distribution = rewards.map((reward, index) => ({
        name: reward.name,
        value: total > 0 ? Math.round((reward.total_redeemed / total) * 100) : 0,
        color: colors[index] || '#6B7280'
      }));

      console.log('✅ Real-time reward distribution fetched:', distribution);
      return distribution;
    } catch (error) {
      console.error('❌ Error fetching reward distribution:', error);
      throw error;
    }
  }

  // Get weekly activity data with real-time updates
  static async getWeeklyActivity() {
    try {
      console.log('📅 Fetching real-time weekly activity...');
      
      const restaurantId = await this.getCurrentRestaurantId();
      
      // Generate real-time data from actual records
      const weeklyData = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
        
        // Get signups for this day
        const { data: signups } = await supabase
          .from('customers')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', format(startOfDay(date), 'yyyy-MM-dd HH:mm:ss'))
          .lte('created_at', format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss'));

        // Get redemptions for this day
        const { data: redemptions } = await supabase
          .from('redemptions')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .gte('redeemed_at', format(startOfDay(date), 'yyyy-MM-dd HH:mm:ss'))
          .lte('redeemed_at', format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss'));

        // Get revenue for this day
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount_spent')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', format(startOfDay(date), 'yyyy-MM-dd HH:mm:ss'))
          .lte('created_at', format(endOfDay(date), 'yyyy-MM-dd HH:mm:ss'));

        const revenue = transactions?.reduce((sum, t) => sum + (t.amount_spent || 0), 0) || 0;

        weeklyData.push({
          day: days[dayIndex],
          signups: signups?.length || 0,
          rewards: redemptions?.length || 0,
          revenue: revenue
        });
      }
      
      console.log('✅ Real-time weekly activity data fetched:', weeklyData);
      return weeklyData;
    } catch (error) {
      console.error('❌ Error fetching weekly activity:', error);
      throw error;
    }
  }

  // Get notifications with real-time updates
  static async getNotifications(limit: number = 10) {
    try {
      console.log('🔔 Fetching real-time notifications...');
      
      const restaurantId = await this.getCurrentRestaurantId();

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      const formattedNotifications = notifications?.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        time: this.formatTimeAgo(n.created_at),
        type: n.type
      })) || [];

      console.log('✅ Real-time notifications fetched:', formattedNotifications.length);
      return formattedNotifications;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
  }

  // Get current user info
  static async getCurrentUser() {
    try {
      console.log('👤 Getting current user info...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        throw new Error('No authenticated user');
      }

      console.log('✅ Getting user info for:', user.email);

      const { data: staff, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !staff) {
        console.log('❌ No staff record found for user');
        throw new Error('No staff record found for user');
      }

      const userData = {
        name: `${staff.first_name} ${staff.last_name}`,
        role: staff.role === 'manager' ? 'Restaurant Manager' : 'Staff Member',
        avatar: `${staff.first_name[0]}${staff.last_name[0]}`
      };
      
      console.log('✅ User data found:', userData);
      return userData;
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
      throw error;
    }
  }

  // Utility methods
  private static formatTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
}