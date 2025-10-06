import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Shield, 
  Activity,
  Settings,
  Key,
  Database,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credentialForm, setCredentialForm] = useState({
    provider: '',
    name: '',
    apiKey: '',
    apiSecret: '',
    isTestnet: false,
    additionalConfig: {}
  });

  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    'adminDashboard',
    () => axios.get(`${API_BASE_URL}/admin/dashboard`).then(res => res.data),
    { retry: 1, refetchInterval: 30000 }
  );

  // Fetch credentials
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery(
    'adminCredentials',
    () => axios.get(`${API_BASE_URL}/credentials/providers`).then(res => res.data.credentials),
    { retry: 1 }
  );

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery(
    'adminUsers',
    () => axios.get(`${API_BASE_URL}/admin/users`).then(res => res.data.users),
    { retry: 1 }
  );

  // Fetch system health
  const { data: healthData, isLoading: healthLoading } = useQuery(
    'systemHealth',
    () => axios.get(`${API_BASE_URL}/monitoring/health`).then(res => res.data),
    { retry: 1, refetchInterval: 10000 }
  );

  // Create credential mutation
  const createCredentialMutation = useMutation(
    (credentialData) => axios.post(`${API_BASE_URL}/credentials/providers`, credentialData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCredentials');
        toast.success('Credentials created successfully!');
        setShowCredentialForm(false);
        setCredentialForm({
          provider: '',
          name: '',
          apiKey: '',
          apiSecret: '',
          isTestnet: false,
          additionalConfig: {}
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create credentials');
      }
    }
  );

  // Update credential mutation
  const updateCredentialMutation = useMutation(
    ({ id, ...credentialData }) => axios.put(`${API_BASE_URL}/credentials/providers/${id}`, credentialData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCredentials');
        toast.success('Credentials updated successfully!');
        setEditingCredential(null);
        setShowCredentialForm(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update credentials');
      }
    }
  );

  // Delete credential mutation
  const deleteCredentialMutation = useMutation(
    (id) => axios.delete(`${API_BASE_URL}/credentials/providers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCredentials');
        toast.success('Credentials deleted successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete credentials');
      }
    }
  );

  // Test credential mutation
  const testCredentialMutation = useMutation(
    (id) => axios.post(`${API_BASE_URL}/credentials/providers/${id}/test`),
    {
      onSuccess: (response) => {
        if (response.data.result.success) {
          toast.success('Credentials test passed!');
        } else {
          toast.error('Credentials test failed: ' + response.data.result.message);
        }
      },
      onError: (error) => {
        toast.error('Credentials test failed: ' + (error.response?.data?.error || 'Unknown error'));
      }
    }
  );

  const handleCreateCredential = (e) => {
    e.preventDefault();
    createCredentialMutation.mutate(credentialForm);
  };

  const handleUpdateCredential = (e) => {
    e.preventDefault();
    updateCredentialMutation.mutate({
      id: editingCredential.id,
      ...credentialForm
    });
  };

  const handleEditCredential = (credential) => {
    setEditingCredential(credential);
    setCredentialForm({
      provider: credential.provider,
      name: credential.name,
      apiKey: '',
      apiSecret: '',
      isTestnet: credential.isTestnet,
      additionalConfig: credential.additionalConfig || {}
    });
    setShowCredentialForm(true);
  };

  const handleDeleteCredential = (id) => {
    if (window.confirm('Are you sure you want to delete these credentials?')) {
      deleteCredentialMutation.mutate(id);
    }
  };

  const handleTestCredential = (id) => {
    testCredentialMutation.mutate(id);
  };

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
      case 'online':
      case 'healthy':
        return 'text-green-400';
      case 'inactive':
      case 'offline':
      case 'unhealthy':
        return 'text-red-400';
      case 'pending':
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
      case 'online':
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'inactive':
      case 'offline':
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  // Mock chart data
  const userGrowthData = [
    { month: 'Jan', users: 1000, trades: 5000 },
    { month: 'Feb', users: 1200, trades: 6000 },
    { month: 'Mar', users: 1500, trades: 8000 },
    { month: 'Apr', users: 1800, trades: 10000 },
    { month: 'May', users: 2200, trades: 12000 },
    { month: 'Jun', users: 2500, trades: 15000 }
  ];

  const tradingVolumeData = [
    { day: 'Mon', volume: 1000000, fees: 1000 },
    { day: 'Tue', volume: 1200000, fees: 1200 },
    { day: 'Wed', volume: 800000, fees: 800 },
    { day: 'Thu', volume: 1500000, fees: 1500 },
    { day: 'Fri', volume: 1800000, fees: 1800 },
    { day: 'Sat', volume: 900000, fees: 900 },
    { day: 'Sun', volume: 1100000, fees: 1100 }
  ];

  const serviceStatusData = [
    { name: 'API Gateway', status: 'healthy', uptime: '99.9%' },
    { name: 'Auth Service', status: 'healthy', uptime: '99.8%' },
    { name: 'Order Service', status: 'healthy', uptime: '99.9%' },
    { name: 'Market Data', status: 'healthy', uptime: '99.7%' },
    { name: 'Ledger Service', status: 'healthy', uptime: '99.9%' },
    { name: 'Custody Service', status: 'healthy', uptime: '99.8%' }
  ];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'credentials', name: 'Credentials', icon: Key },
    { id: 'monitoring', name: 'Monitoring', icon: Activity },
    { id: 'settings', name: 'Settings', icon: Settings }
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
          <p className="text-gray-400">Manage and monitor the exchange platform</p>
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
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

              {/* Service Status */}
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Service Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceStatusData.map((service, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{service.name}</h4>
                        {getStatusIcon(service.status)}
                      </div>
                      <p className={`text-sm ${getStatusColor(service.status)}`}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </p>
                      <p className="text-gray-400 text-sm">Uptime: {service.uptime}</p>
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
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
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

          {/* Credentials Tab */}
          {activeTab === 'credentials' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Provider Credentials</h3>
                <button
                  onClick={() => setShowCredentialForm(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Credentials</span>
                </button>
              </div>

              {credentialsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="small" text="Loading credentials..." />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {credentialsData?.map((credential) => (
                    <div key={credential.id} className="card">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-white">{credential.name}</h4>
                          <p className="text-gray-400 text-sm capitalize">{credential.provider}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(credential.isActive ? 'active' : 'inactive')}
                          <span className={`text-sm ${getStatusColor(credential.isActive ? 'active' : 'inactive')}`}>
                            {credential.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Testnet:</span>
                          <span className="text-white">{credential.isTestnet ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Created:</span>
                          <span className="text-white">{formatDate(credential.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleTestCredential(credential.id)}
                          className="flex-1 btn-secondary flex items-center justify-center space-x-2"
                          disabled={testCredentialMutation.isLoading}
                        >
                          <Play className="w-4 h-4" />
                          <span>Test</span>
                        </button>
                        <button
                          onClick={() => handleEditCredential(credential)}
                          className="flex-1 btn-primary flex items-center justify-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCredential(credential.id)}
                          className="flex-1 btn-danger flex items-center justify-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
                {healthLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="small" text="Loading health data..." />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {serviceStatusData.map((service, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white">{service.name}</h4>
                          {getStatusIcon(service.status)}
                        </div>
                        <p className={`text-sm ${getStatusColor(service.status)}`}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </p>
                        <p className="text-gray-400 text-sm">Uptime: {service.uptime}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
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
                      <Line type="monotone" dataKey="trades" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4">System Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Exchange Name</label>
                    <input
                      type="text"
                      defaultValue="Coinbase Clone"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Maintenance Mode</label>
                    <div className="flex items-center space-x-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-gray-400 text-sm">Enable maintenance mode</span>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Trading Fees</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Maker Fee (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          defaultValue="0.1"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Taker Fee (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          defaultValue="0.1"
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                  <button className="btn-primary">Save Settings</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credential Form Modal */}
      {showCredentialForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingCredential ? 'Edit Credentials' : 'Add New Credentials'}
            </h3>
            <form onSubmit={editingCredential ? handleUpdateCredential : handleCreateCredential} className="space-y-4">
              <div>
                <label className="form-label">Provider</label>
                <select
                  value={credentialForm.provider}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, provider: e.target.value }))}
                  className="form-input"
                  required
                >
                  <option value="">Select Provider</option>
                  <option value="binance">Binance</option>
                  <option value="coinbase">Coinbase</option>
                  <option value="fireblocks">Fireblocks</option>
                  <option value="bitgo">BitGo</option>
                </select>
              </div>

              <div>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  value={credentialForm.name}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="e.g., Main Binance Account"
                  required
                />
              </div>

              <div>
                <label className="form-label">API Key</label>
                <input
                  type="text"
                  value={credentialForm.apiKey}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="form-input"
                  placeholder="Enter API key"
                  required
                />
              </div>

              <div>
                <label className="form-label">API Secret</label>
                <input
                  type="password"
                  value={credentialForm.apiSecret}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, apiSecret: e.target.value }))}
                  className="form-input"
                  placeholder="Enter API secret"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isTestnet"
                  checked={credentialForm.isTestnet}
                  onChange={(e) => setCredentialForm(prev => ({ ...prev, isTestnet: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isTestnet" className="text-sm text-gray-300">
                  Testnet/Sandbox
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCredentialForm(false);
                    setEditingCredential(null);
                    setCredentialForm({
                      provider: '',
                      name: '',
                      apiKey: '',
                      apiSecret: '',
                      isTestnet: false,
                      additionalConfig: {}
                    });
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={createCredentialMutation.isLoading || updateCredentialMutation.isLoading}
                >
                  {createCredentialMutation.isLoading || updateCredentialMutation.isLoading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="small" text="" />
                      <span className="ml-2">Saving...</span>
                    </div>
                  ) : (
                    editingCredential ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;