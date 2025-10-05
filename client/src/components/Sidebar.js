import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Home,
  TrendingUp,
  Wallet,
  User,
  Shield,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Trading', href: '/trading', icon: TrendingUp },
    { name: 'Wallets', href: '/wallets', icon: Wallet },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'KYC', href: '/kyc', icon: Shield },
  ];

  // Add admin link if user is admin
  if (user?.email === 'admin@coinbase-clone.com') {
    navigation.push({ name: 'Admin', href: '/admin', icon: BarChart3 });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed left-0 top-16 h-screen w-64 bg-gray-800 border-r border-gray-700 z-40">
      <div className="p-6">
        {/* User Info */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats */}
        <div className="mt-8 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-white font-medium mb-3">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Account Status</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user?.accountStatus === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user?.accountStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">KYC Status</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user?.kycStatus === 'approved' 
                  ? 'bg-green-100 text-green-800' 
                  : user?.kycStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user?.kycStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">2FA</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user?.twoFactorEnabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Help & Support */}
        <div className="mt-6">
          <Link
            to="/help"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all duration-200"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Help & Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;