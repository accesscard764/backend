import { useState, useEffect } from 'react';
import { DashboardService } from '../services/dashboardService';

export interface DashboardStats {
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  description: string;
}

export interface RecentActivity {
  id: string;
  customer: string;
  action: string;
  reward: string | null;
  time: string;
  points: number;
  tier: string;
  avatar: string;
}

export interface CustomerGrowthData {
  date: string;
  customers: number;
  returning: number;
}

export interface RewardDistribution {
  name: string;
  value: number;
  color: string;
}

export interface WeeklyActivity {
  day: string;
  signups: number;
  rewards: number;
  revenue: number;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

export interface UserData {
  name: string;
  role: string;
  avatar: string;
}

export const useDashboardData = (timeRange: string = '7d') => {
  const [stats, setStats] = useState<DashboardStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [customerData, setCustomerData] = useState<CustomerGrowthData[]>([]);
  const [rewardDistribution, setRewardDistribution] = useState<RewardDistribution[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      console.log('🚀 Starting dashboard data fetch...');
      setLoading(true);
      setError(null);

      // Fetch all data from real backend
      const [
        statsData,
        activityData,
        growthData,
        distributionData,
        weeklyData,
        notificationsData,
        userData
      ] = await Promise.all([
        DashboardService.getDashboardStats(timeRange),
        DashboardService.getRecentActivity(10),
        DashboardService.getCustomerGrowthData(timeRange),
        DashboardService.getRewardDistribution(),
        DashboardService.getWeeklyActivity(),
        DashboardService.getNotifications(5),
        DashboardService.getCurrentUser()
      ]);

      setStats(statsData);
      setRecentActivity(activityData);
      setCustomerData(growthData);
      setRewardDistribution(distributionData);
      setWeeklyActivity(weeklyData);
      setNotifications(notificationsData);
      setCurrentUser(userData);

      console.log('✅ Dashboard data loaded successfully');
      console.log('📊 Stats:', statsData);
      console.log('📋 Recent Activity:', activityData.length, 'items');
      console.log('📈 Customer Growth:', growthData.length, 'data points');
      console.log('🎁 Reward Distribution:', distributionData.length, 'categories');
      console.log('📅 Weekly Activity:', weeklyData.length, 'days');
      console.log('🔔 Notifications:', notificationsData.length, 'items');
    } catch (err: any) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Removed auto-refresh - data will only refresh on manual trigger or timeRange change
  }, [timeRange]);

  const refreshData = () => {
    console.log('🔄 Manual refresh triggered');
    fetchDashboardData();
  };

  return {
    stats,
    recentActivity,
    customerData,
    rewardDistribution,
    weeklyActivity,
    notifications,
    currentUser,
    loading,
    error,
    refreshData
  };
};