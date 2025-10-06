import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Shield,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Dashboard = () => {
  const [showBalances, setShowBalances] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery(
    'userProfile',
    () => axios.get(`${API_BASE_URL}/users/profile`).then(res => res.data.user),
    { retry: 1 }
  );

  // Fetch wallets
  const { data: wallets, isLoading: walletsLoading } = useQuery(
    'wallets',
    () => axios.get(`${API_BASE_URL}/users/wallets`).then(res => res.data.wallets),
    { retry: 1 }
  );

  // Fetch market data
  const { data: marketData, isLoading: marketLoading } = useQuery(
    'marketData',
    () => axios.get(`${API_BASE_URL}/market-data`).then(res => res.data.marketData),
    { refetchInterval: 5000 }
  );

  // Fetch recent trades
  const { data: recentTrades, isLoading: tradesLoading } = useQuery(
    'recentTrades',
    () => axios.get(`${API_BASE_URL}/trading/trades?limit=10`).then(res => res.data.trades),
    { retry: 1 }
  );

  // Calculate total portfolio value
  const totalPortfolioValue = wallets?.reduce((total, wallet) => {
    const marketPrice = marketData?.find(m => m.pair === `${wallet.currency}/USD`)?.price || 0;
    return total + (wallet.balance * marketPrice);
  }, 0) || 0;

  // Calculate 24h change
  const portfolioChange = 0; // This would be calculated from historical data

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change) => {
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
        {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  // Mock chart data
  const chartData = [
    { time: '00:00', price: 45000 },
    { time: '04:00', price: 46000 },
    { time: '08:00', price: 44000 },
    { time: '12:00', price: 47000 },
    { time: '16:00', price: 48000 },
    { time: '20:00', price: 46500 },
    { time: '24:00', price: 47000 }
  ];

  if (profileLoading || walletsLoading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back, {userProfile?.firstName}!</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            {showBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            <span>{showBalances ? 'Hide' : 'Show'} Balances</span>
          </button>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-white">
                {showBalances ? formatPrice(totalPortfolioValue) : '••••••'}
              </p>
              <div className="flex items-center mt-2">
                {formatChange(portfolioChange)}
                <span className="text-gray-400 text-sm ml-2">24h</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Wallets</p>
              <p className="text-2xl font-bold text-white">{wallets?.length || 0}</p>
              <p className="text-gray-400 text-sm mt-2">Cryptocurrency wallets</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Account Status</p>
              <p className="text-2xl font-bold text-white capitalize">
                {userProfile?.accountStatus}
              </p>
              <div className="flex items-center mt-2">
                <Shield className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-green-400 text-sm">Verified</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* KYC Status Alert */}
      {userProfile?.kycStatus !== 'approved' && (
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-3" />
            <div>
              <h3 className="text-yellow-400 font-medium">KYC Verification Required</h3>
              <p className="text-yellow-200 text-sm mt-1">
                Complete your identity verification to access all features and increase your trading limits.
              </p>
              <button className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                Complete KYC →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Portfolio Performance</h3>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm"
            >
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="1y">1y</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [formatPrice(value), 'Price']}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {tradesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="small" text="Loading trades..." />
              </div>
            ) : recentTrades?.length > 0 ? (
              recentTrades.slice(0, 5).map((trade, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${trade.side === 'buy' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {trade.side === 'buy' ? 'Bought' : 'Sold'} {trade.pair}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {new Date(trade.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">
                      {formatPrice(trade.price)}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {trade.quantity} {trade.pair.split('/')[0]}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Balances */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Wallet Balances</h3>
          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            Manage Wallets
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Currency</th>
                <th>Balance</th>
                <th>Available</th>
                <th>Locked</th>
                <th>USD Value</th>
                <th>24h Change</th>
              </tr>
            </thead>
            <tbody>
              {wallets?.map((wallet) => {
                const marketPrice = marketData?.find(m => m.pair === `${wallet.currency}/USD`)?.price || 0;
                const usdValue = wallet.balance * marketPrice;
                const change = marketData?.find(m => m.pair === `${wallet.currency}/USD`)?.priceChangePercent24h || 0;
                
                return (
                  <tr key={wallet.currency}>
                    <td>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {wallet.currency.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{wallet.currency}</span>
                      </div>
                    </td>
                    <td>
                      {showBalances ? wallet.balance.toFixed(8) : '••••••••'}
                    </td>
                    <td>
                      {showBalances ? wallet.availableBalance.toFixed(8) : '••••••••'}
                    </td>
                    <td>
                      {showBalances ? wallet.lockedBalance.toFixed(8) : '••••••••'}
                    </td>
                    <td>
                      {showBalances ? formatPrice(usdValue) : '••••••'}
                    </td>
                    <td>
                      {formatChange(change)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Market Overview</h3>
          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            View All Markets
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketLoading ? (
            <div className="col-span-full flex justify-center py-8">
              <LoadingSpinner size="small" text="Loading market data..." />
            </div>
          ) : (
            marketData?.slice(0, 6).map((crypto) => (
              <div key={crypto.pair} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-white">{crypto.baseCurrency}</h4>
                    <p className="text-gray-400 text-sm">{crypto.pair}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{formatPrice(crypto.price)}</p>
                    <div className="flex items-center">
                      {formatChange(crypto.priceChangePercent24h)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Vol: ${(crypto.volume24h / 1000000).toFixed(1)}M</span>
                  <span>High: {formatPrice(crypto.high24h)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;