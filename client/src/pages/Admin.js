import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Shield, 
  Activity,
  Eye,
  EyeOff,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    'adminDashboard',
    () => axios.get(`${API_BASE_URL}/admin/dashboard`).then(res => res.data),
    { retry: 1 }
  );

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery(
    'adminUsers',
    () => axios.get(`${API_BASE_URL}/admin/users`).then(res => res.data.users),
    { retry: 1 }
  );

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    'adminOrders',
    () => axios.get(`${API_BASE_URL}/admin/orders`).then(res => res.data.orders),
    { retry: 1 }
  );

  // Fetch trades
  const { data: tradesData, isLoading: tradesLoading } = useQuery(
    'adminTrades',
    () => axios.get(`${API_BASE_URL}/admin/trades`).then(res => res.data.trades),
    { retry: 1 }
  );

  // Fetch market data
  const { data: marketData, isLoading: marketLoading } = useQuery(
    'adminMarketData',
    () => axios.get(`${API_BASE_URL}/admin/market-data`).then(res => res.data.marketData),
    { retry: 1 }
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Mock chart data
  const userGrowthData = [
    { month: 'Jan', users: 1000 },
    { month: 'Feb', users: 1200 },
    { month: 'Mar', users: 1500 },
    { month: 'Apr', users: 1800 },
    { month: 'May', users: 2200 },
    { month: 'Jun', users: 2500 }
  ];

  const tradingVolumeData = [
    { day: 'Mon', volume: 1000000 },
    { day: 'Tue', volume: 1200000 },
    { day: 'Wed', volume: 800000 },
    { day: 'Thu', volume: 1500000 },
    { day: 'Fri', volume: 1800000 },
    { day: 'Sat', volume: 900000 },
    { day: 'Sun', volume: 1100000 }
  ];

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Activity },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'orders', name: 'Orders', icon: TrendingUp },
    { id: 'trades', name: 'Trades', icon: DollarSign },
    { id: 'markets', name: 'Markets', icon: Shield }
  ];

  if (dashboardLoading) {
    return <LoadingSpinner text="Loading admin dashboard..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400">Monitor and manage the platform</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="btn-secondary flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">
                        {dashboardData?.stats?.totalUsers?.toLocaleString() || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Users</p>
                      <p className="text-2xl font-bold text-white">
                        {dashboardData?.stats?.activeUsers?.toLocaleString() || 0}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-green-400" />
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Volume</p>
                      <p className="text-2xl font-bold text-white">
                        ${(dashboardData?.stats?.totalVolume / 1000000000).toFixed(1)}B
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-400" />
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Pending KYC</p>
                      <p className="text-2xl font-bold text-white">
                        {dashboardData?.stats?.pendingKYC || 0}
                      </p>
                    </div>
                    <Shield className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">Trading Volume</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tradingVolumeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value) => [formatPrice(value), 'Volume']}
                        />
                        <Bar dataKey="volume" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {dashboardData?.recentUsers?.slice(0, 5).map((user, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{formatDate(user.createdAt)}</p>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(user.accountStatus)}`}>
                          {user.accountStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Users</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="small" text="Loading users..." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>KYC Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersData?.map((user) => (
                        <tr key={user._id}>
                          <td>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">
                                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                </span>
                              </div>
                              <span className="font-medium">{user.firstName} {user.lastName}</span>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(user.accountStatus)}`}>
                              {user.accountStatus}
                            </span>
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(user.kycStatus)}`}>
                              {user.kycStatus}
                            </span>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>
                            <button className="text-blue-400 hover:text-blue-300 text-sm">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Orders</h3>
                <div className="flex items-center space-x-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="filled">Filled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="small" text="Loading orders..." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Pair</th>
                        <th>Side</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersData?.map((order) => (
                        <tr key={order.id}>
                          <td>{order.userId?.firstName} {order.userId?.lastName}</td>
                          <td className="font-medium">{order.pair}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs ${
                              order.side === 'buy' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="capitalize">{order.type}</td>
                          <td>{order.quantity}</td>
                          <td>{order.price ? formatPrice(order.price) : 'Market'}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{formatDate(order.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Trades Tab */}
          {activeTab === 'trades' && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Trades</h3>
              </div>

              {tradesLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="small" text="Loading trades..." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pair</th>
                        <th>Buyer</th>
                        <th>Seller</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total Value</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradesData?.map((trade) => (
                        <tr key={trade.id}>
                          <td className="font-medium">{trade.pair}</td>
                          <td>{trade.buyerId?.firstName} {trade.buyerId?.lastName}</td>
                          <td>{trade.sellerId?.firstName} {trade.sellerId?.lastName}</td>
                          <td>{trade.quantity}</td>
                          <td>{formatPrice(trade.price)}</td>
                          <td>{formatPrice(trade.totalValue)}</td>
                          <td>{formatDate(trade.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Markets Tab */}
          {activeTab === 'markets' && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Market Data</h3>
              </div>

              {marketLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="small" text="Loading market data..." />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketData?.map((market) => (
                    <div key={market.pair} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-white">{market.pair}</h4>
                        <span className="text-sm text-gray-400">
                          {market.priceChangePercent24h >= 0 ? '+' : ''}{market.priceChangePercent24h.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xl font-bold text-white">{formatPrice(market.price)}</p>
                      <div className="flex justify-between text-sm text-gray-400 mt-2">
                        <span>Vol: ${(market.volume24h / 1000000).toFixed(1)}M</span>
                        <span>High: {formatPrice(market.high24h)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;