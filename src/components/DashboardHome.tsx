import React, { useState } from 'react';
import { 
  Users, TrendingUp, Gift, DollarSign, ArrowUpRight, ArrowDownRight,
  Filter, Download, Eye, MoreVertical, RefreshCw, AlertCircle, UserPlus
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';
import QRCodeGenerator from './QRCodeGenerator';

const DashboardHome = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const {
    stats,
    recentActivity,
    customerData,
    rewardDistribution,
    weeklyActivity,
    notifications,
    loading,
    error,
    refreshData
  } = useDashboardData(timeRange);

  const iconMap = {
    'Total Customers': Users,
    'Points Issued': TrendingUp,
    'Rewards Claimed': Gift,
    'Revenue Impact': DollarSign
  };

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-gray-200">
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <p>Please check:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your internet connection</li>
              <li>Database connection settings</li>
              <li>Your user permissions</li>
            </ul>
          </div>
          <button
            onClick={refreshData}
            className="px-6 py-3 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Check if this is a new restaurant with no data
  const isNewRestaurant = stats.every(stat => stat.value === '0' || stat.value === '$0');

  return (
    <div className="animate-fade-in space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button 
            onClick={refreshData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = iconMap[stat.name as keyof typeof iconMap] || Users;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#1E2A78] transition-all duration-300 group transform hover:scale-[1.02] hover:shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#1E2A78]/10 to-[#3B4B9A]/10 text-[#1E2A78] group-hover:from-[#1E2A78] group-hover:to-[#3B4B9A] group-hover:text-white transition-all duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  stat.trend === 'up' 
                    ? 'text-green-700 bg-green-100' 
                    : 'text-red-700 bg-red-100'
                }`}>
                  <span>{stat.change}</span>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 ml-1" />
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">{stat.name}</h3>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Restaurant Welcome Section */}
      {isNewRestaurant && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Your Loyalty Program!</h2>
            <p className="text-gray-600 mb-6">
              Your restaurant dashboard is ready. Start by setting up your QR code for customers to join your loyalty program.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <QRCodeGenerator />
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Start Guide</h3>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#1E2A78] rounded-full"></div>
                    Display your QR code at your restaurant
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#1E2A78] rounded-full"></div>
                    Customers scan to join your program
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#1E2A78] rounded-full"></div>
                    They earn points with every purchase
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#1E2A78] rounded-full"></div>
                    Track everything in this dashboard
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Charts Grid - Only show if there's data */}
      {!isNewRestaurant && customerData.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Customer Growth Chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Customer Growth</h2>
                <p className="text-sm text-gray-500">New vs returning customers</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={customerData}>
                  <defs>
                    <linearGradient id="customers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E2A78" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1E2A78" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="returning" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    className="text-sm text-gray-500"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    className="text-sm text-gray-500"
                  />
                  <Tooltip content={renderCustomTooltip} />
                  <Area
                    type="monotone"
                    dataKey="customers"
                    stroke="#1E2A78"
                    strokeWidth={3}
                    fill="url(#customers)"
                    name="Total Customers"
                  />
                  <Area
                    type="monotone"
                    dataKey="returning"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#returning)"
                    name="Returning Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reward Distribution */}
          {rewardDistribution.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Popular Rewards</h2>
                  <p className="text-sm text-gray-500">Distribution by type</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rewardDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {rewardDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={renderCustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {rewardDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Activity Chart - Only show if there's data */}
      {!isNewRestaurant && weeklyActivity.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weekly Performance</h2>
              <p className="text-sm text-gray-500">Signups, rewards, and revenue trends</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#1E2A78]" />
                  <span className="text-gray-600">Signups</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
                  <span className="text-gray-600">Rewards</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} barGap={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  className="text-sm text-gray-500"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  className="text-sm text-gray-500"
                />
                <Tooltip content={renderCustomTooltip} />
                <Bar 
                  dataKey="signups" 
                  fill="#1E2A78" 
                  radius={[4, 4, 0, 0]}
                  name="Signups"
                />
                <Bar 
                  dataKey="rewards" 
                  fill="#8B5CF6" 
                  radius={[4, 4, 0, 0]}
                  name="Rewards"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Enhanced Recent Activity - Only show if there's data */}
      {!isNewRestaurant && recentActivity.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <p className="text-sm text-gray-500">Latest customer interactions</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1E2A78] hover:bg-[#1E2A78] hover:text-white rounded-lg transition-all duration-200">
                <Eye className="h-4 w-4" />
                View All
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity, index) => (
              <div 
                key={activity.id} 
                className="p-6 hover:bg-gray-50 transition-all duration-200 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] text-white flex items-center justify-center font-medium text-sm shadow-lg">
                    {activity.avatar}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{activity.customer}</p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        activity.tier === 'gold' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        activity.tier === 'silver' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                        'bg-orange-100 text-orange-800 border border-orange-200'
                      }`}>
                        {activity.tier.charAt(0).toUpperCase() + activity.tier.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-sm text-gray-600">{activity.action}</p>
                        {activity.reward && (
                          <p className="text-sm font-medium text-[#1E2A78]">{activity.reward}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{activity.points} pts</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                  
                  <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data States */}
      {recentActivity.length === 0 && !loading && !error && !isNewRestaurant && (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
          <p className="text-gray-500">Customer activity will appear here once you start using the loyalty program.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;