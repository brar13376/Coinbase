import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Eye, 
  EyeOff, 
  Copy, 
  QrCode, 
  Send, 
  Download,
  Upload,
  Wallet,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Wallets = () => {
  const [showBalances, setShowBalances] = useState(true);
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [newWalletCurrency, setNewWalletCurrency] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const queryClient = useQueryClient();

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

  // Create wallet mutation
  const createWalletMutation = useMutation(
    (currency) => axios.post(`${API_BASE_URL}/users/wallets`, { currency }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('wallets');
        toast.success('Wallet created successfully!');
        setShowCreateWallet(false);
        setNewWalletCurrency('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create wallet');
      }
    }
  );

  const handleCreateWallet = (e) => {
    e.preventDefault();
    if (newWalletCurrency) {
      createWalletMutation.mutate(newWalletCurrency);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

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
        {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  const getCurrencyIcon = (currency) => {
    return currency.charAt(0).toUpperCase();
  };

  const getCurrencyColor = (currency) => {
    const colors = {
      'BTC': 'bg-orange-500',
      'ETH': 'bg-blue-500',
      'BNB': 'bg-yellow-500',
      'ADA': 'bg-blue-600',
      'SOL': 'bg-purple-500',
      'DOT': 'bg-pink-500',
      'MATIC': 'bg-purple-600',
      'AVAX': 'bg-red-500',
      'USD': 'bg-green-500',
      'EUR': 'bg-blue-700'
    };
    return colors[currency] || 'bg-gray-500';
  };

  if (walletsLoading) {
    return <LoadingSpinner text="Loading wallets..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Wallets</h1>
          <p className="text-gray-400">Manage your cryptocurrency wallets</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            {showBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            <span>{showBalances ? 'Hide' : 'Show'} Balances</span>
          </button>
          <button
            onClick={() => setShowCreateWallet(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Wallet</span>
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-white">
                {showBalances ? formatPrice(
                  wallets?.reduce((total, wallet) => {
                    const marketPrice = marketData?.find(m => m.pair === `${wallet.currency}/USD`)?.price || 0;
                    return total + (wallet.balance * marketPrice);
                  }, 0) || 0
                ) : '••••••'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Wallets</p>
              <p className="text-2xl font-bold text-white">{wallets?.length || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Cryptocurrency wallets</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">24h Change</p>
              <p className="text-2xl font-bold text-white">+2.34%</p>
              <p className="text-green-400 text-sm mt-1">+$1,234.56</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets?.map((wallet) => {
          const marketPrice = marketData?.find(m => m.pair === `${wallet.currency}/USD`)?.price || 0;
          const usdValue = wallet.balance * marketPrice;
          const change = marketData?.find(m => m.pair === `${wallet.currency}/USD`)?.priceChangePercent24h || 0;
          
          return (
            <div key={wallet.currency} className="card-hover">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${getCurrencyColor(wallet.currency)} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">
                      {getCurrencyIcon(wallet.currency)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{wallet.currency}</h3>
                    <p className="text-gray-400 text-sm">
                      {wallet.currency === 'USD' || wallet.currency === 'EUR' ? 'Fiat Currency' : 'Cryptocurrency'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedWallet(wallet);
                    setShowQR(true);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Balance</p>
                  <p className="text-xl font-bold text-white">
                    {showBalances ? wallet.balance.toFixed(8) : '••••••••'} {wallet.currency}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {showBalances ? formatPrice(usdValue) : '••••••'}
                  </p>
                </div>

                <div className="flex justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Available</p>
                    <p className="text-white font-medium">
                      {showBalances ? wallet.availableBalance.toFixed(8) : '••••••••'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Locked</p>
                    <p className="text-white font-medium">
                      {showBalances ? wallet.lockedBalance.toFixed(8) : '••••••••'}
                    </p>
                  </div>
                </div>

                {wallet.currency !== 'USD' && wallet.currency !== 'EUR' && (
                  <div>
                    <p className="text-gray-400 text-sm">24h Change</p>
                    {formatChange(change)}
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => {
                      setSelectedWallet(wallet);
                      // Navigate to send page or open send modal
                    }}
                    className="flex-1 btn-primary flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWallet(wallet);
                      // Navigate to receive page or open receive modal
                    }}
                    className="flex-1 btn-secondary flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Receive</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Wallet Modal */}
      {showCreateWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Wallet</h3>
            <form onSubmit={handleCreateWallet} className="space-y-4">
              <div>
                <label className="form-label">Currency</label>
                <select
                  value={newWalletCurrency}
                  onChange={(e) => setNewWalletCurrency(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">Select a currency</option>
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="BNB">Binance Coin (BNB)</option>
                  <option value="ADA">Cardano (ADA)</option>
                  <option value="SOL">Solana (SOL)</option>
                  <option value="DOT">Polkadot (DOT)</option>
                  <option value="MATIC">Polygon (MATIC)</option>
                  <option value="AVAX">Avalanche (AVAX)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateWallet(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWalletMutation.isLoading}
                  className="flex-1 btn-primary"
                >
                  {createWalletMutation.isLoading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="small" text="" />
                      <span className="ml-2">Creating...</span>
                    </div>
                  ) : (
                    'Create Wallet'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && selectedWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              {selectedWallet.currency} Wallet Address
            </h3>
            
            <div className="text-center space-y-4">
              <div className="w-48 h-48 bg-white rounded-lg mx-auto flex items-center justify-center">
                <QrCode className="w-32 h-32 text-gray-800" />
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-sm mb-2">Wallet Address</p>
                <p className="text-white font-mono text-sm break-all">
                  {selectedWallet.address || 'Address not available'}
                </p>
              </div>
              
              <button
                onClick={() => copyToClipboard(selectedWallet.address || '')}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Address</span>
              </button>
              
              <div className="text-gray-400 text-xs">
                <p>Only send {selectedWallet.currency} to this address.</p>
                <p>Sending other currencies may result in permanent loss.</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;