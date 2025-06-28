import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Filter, Download, Eye, MoreVertical,
  Star, Crown, Award, TrendingUp, Calendar, Phone, Mail,
  Gift, Zap, RefreshCw, UserPlus, Edit, Trash2
} from 'lucide-react';
import { CustomerService } from '../services/customerService';
import CustomerWallet from './CustomerWallet';
import type { Customer } from '../lib/supabase';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddPoints, setShowAddPoints] = useState<string | null>(null);
  const [addPointsData, setAddPointsData] = useState({ points: '', description: '', amount: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const customersData = await CustomerService.getCustomers();
      setCustomers(customersData);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      fetchCustomers();
      return;
    }

    try {
      const searchResults = await CustomerService.searchCustomers(query);
      setCustomers(searchResults);
    } catch (err: any) {
      console.error('Error searching customers:', err);
    }
  };

  const handleAddPoints = async (customerId: string) => {
    try {
      const points = parseInt(addPointsData.points);
      const amount = addPointsData.amount ? parseFloat(addPointsData.amount) : undefined;
      
      if (isNaN(points) || points <= 0) {
        alert('Please enter a valid number of points');
        return;
      }

      await CustomerService.addPoints(
        customerId, 
        points, 
        addPointsData.description || 'Manual points addition',
        amount
      );

      setShowAddPoints(null);
      setAddPointsData({ points: '', description: '', amount: '' });
      fetchCustomers();
      
      alert('Points added successfully!');
    } catch (err: any) {
      console.error('Error adding points:', err);
      alert(err.message || 'Failed to add points');
    }
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'gold':
        return { 
          name: 'Gold', 
          color: 'text-yellow-600 bg-yellow-100', 
          icon: Crown 
        };
      case 'silver':
        return { 
          name: 'Silver', 
          color: 'text-gray-600 bg-gray-100', 
          icon: Award 
        };
      default:
        return { 
          name: 'Bronze', 
          color: 'text-orange-600 bg-orange-100', 
          icon: Star 
        };
    }
  };

  if (selectedCustomer) {
    return (
      <CustomerWallet 
        customerId={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="h-64 bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="text-red-500 mb-4">
            <Users className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Customers</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCustomers}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active).length;
  const totalPoints = customers.reduce((sum, c) => sum + c.total_points, 0);
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your loyalty program members</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCustomers}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowAddCustomer(true)}
            className="px-4 py-2 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Members</p>
              <p className="text-2xl font-bold text-gray-900">{activeCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Points</p>
              <p className="text-2xl font-bold text-gray-900">{totalPoints.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
            />
          </div>
          <button className="p-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            <Filter className="h-5 w-5" />
          </button>
          <button className="p-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            <Download className="h-5 w-5" />
          </button>
        </div>

        {/* Customers Table */}
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Customers Found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'No customers match your search criteria.' : 'Start building your customer base by adding your first customer.'}
            </p>
            <button
              onClick={() => setShowAddCustomer(true)}
              className="px-6 py-3 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors flex items-center gap-2 mx-auto"
            >
              <UserPlus className="h-4 w-4" />
              Add First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Tier</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Points</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Visits</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Total Spent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Last Visit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const tierInfo = getTierInfo(customer.current_tier);
                  const TierIcon = tierInfo.icon;
                  
                  return (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] text-white flex items-center justify-center font-medium">
                            {customer.first_name[0]}{customer.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tierInfo.color}`}>
                          <TierIcon className="h-3 w-3" />
                          {tierInfo.name}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{customer.total_points}</p>
                          <p className="text-xs text-gray-500">{customer.lifetime_points} lifetime</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900">{customer.visit_count}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900">${customer.total_spent.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-500">
                          {customer.last_visit 
                            ? new Date(customer.last_visit).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedCustomer(customer.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Wallet"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setShowAddPoints(customer.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Add Points"
                          >
                            <Zap className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Points Modal */}
      {showAddPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Points</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <input
                  type="number"
                  value={addPointsData.points}
                  onChange={(e) => setAddPointsData(prev => ({ ...prev, points: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="Enter points to add"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={addPointsData.description}
                  onChange={(e) => setAddPointsData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="Reason for adding points"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Spent (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={addPointsData.amount}
                  onChange={(e) => setAddPointsData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddPoints(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddPoints(showAddPoints)}
                className="flex-1 px-4 py-2 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors"
              >
                Add Points
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;