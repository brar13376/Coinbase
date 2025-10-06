import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUp, 
  ArrowDown,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Trading = () => {
  const [selectedPair, setSelectedPair] = useState('BTC/USD');
  const [orderType, setOrderType] = useState('market');
  const [orderSide, setOrderSide] = useState('buy');
  const [orderForm, setOrderForm] = useState({
    quantity: '',
    price: '',
    stopPrice: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch market data
  const { data: marketData, isLoading: marketLoading } = useQuery(
    'marketData',
    () => axios.get(`${API_BASE_URL}/market-data`).then(res => res.data.marketData),
    { refetchInterval: 1000 }
  );

  // Fetch order book
  const { data: orderBook, isLoading: orderBookLoading } = useQuery(
    ['orderBook', selectedPair],
    () => axios.get(`${API_BASE_URL}/trading/orderbook/${selectedPair}`).then(res => res.data),
    { refetchInterval: 1000 }
  );

  // Fetch recent trades
  const { data: recentTrades, isLoading: tradesLoading } = useQuery(
    ['recentTrades', selectedPair],
    () => axios.get(`${API_BASE_URL}/market-data/${selectedPair}/trades`).then(res => res.data.trades),
    { refetchInterval: 1000 }
  );

  // Fetch user orders
  const { data: userOrders, isLoading: ordersLoading } = useQuery(
    'userOrders',
    () => axios.get(`${API_BASE_URL}/trading/orders`).then(res => res.data.orders),
    { refetchInterval: 5000 }
  );

  const selectedMarket = marketData?.find(m => m.pair === selectedPair);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const orderData = {
        pair: selectedPair,
        side: orderSide,
        type: orderType,
        quantity: parseFloat(orderForm.quantity),
        ...(orderType === 'limit' && { price: parseFloat(orderForm.price) }),
        ...(orderType === 'stop' && { stopPrice: parseFloat(orderForm.stopPrice) })
      };

      await axios.post(`${API_BASE_URL}/trading/orders`, orderData);
      
      // Reset form
      setOrderForm({ quantity: '', price: '', stopPrice: '' });
      
      // Refetch orders
      // queryClient.invalidateQueries('userOrders');
      
    } catch (error) {
      console.error('Order submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatChange = (change) => {
    const isPositive = change >= 0;
    return (
      <span className={`${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

  // Mock chart data
  const chartData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    price: selectedMarket?.price + (Math.random() - 0.5) * 1000
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading</h1>
          <p className="text-gray-400">Trade cryptocurrencies with advanced tools</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Market Selector */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Markets</h3>
            <div className="space-y-2">
              {marketData?.slice(0, 10).map((market) => (
                <button
                  key={market.pair}
                  onClick={() => setSelectedPair(market.pair)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedPair === market.pair
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{market.baseCurrency}</p>
                      <p className="text-sm opacity-75">{market.pair}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(market.price)}</p>
                      <p className="text-sm">{formatChange(market.priceChangePercent24h)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Trading Area */}
        <div className="lg:col-span-2">
          {/* Price Chart */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedPair} - {formatPrice(selectedMarket?.price || 0)}
                </h2>
                <div className="flex items-center space-x-4">
                  <span className={formatChange(selectedMarket?.priceChangePercent24h || 0)}>
                    {formatChange(selectedMarket?.priceChangePercent24h || 0)}
                  </span>
                  <span className="text-gray-400 text-sm">
                    24h Volume: ${(selectedMarket?.volume24h / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-gray-700 text-white rounded text-sm">1H</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">4H</button>
                <button className="px-3 py-1 bg-gray-700 text-white rounded text-sm">1D</button>
              </div>
            </div>
            <div className="h-80">
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
                    domain={['dataMin - 100', 'dataMax + 100']}
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

          {/* Order Form */}
          <div className="card">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setOrderSide('buy')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  orderSide === 'buy'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setOrderSide('sell')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  orderSide === 'sell'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Sell
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div>
                <label className="form-label">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="form-input"
                >
                  <option value="market">Market Order</option>
                  <option value="limit">Limit Order</option>
                  <option value="stop">Stop Order</option>
                </select>
              </div>

              <div>
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="form-input"
                  placeholder="0.00"
                  required
                />
              </div>

              {orderType === 'limit' && (
                <div>
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderForm.price}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                    className="form-input"
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              {orderType === 'stop' && (
                <div>
                  <label className="form-label">Stop Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderForm.stopPrice}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, stopPrice: e.target.value }))}
                    className="form-input"
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  orderSide === 'buy'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="small" text="" />
                    <span className="ml-2">Placing Order...</span>
                  </div>
                ) : (
                  `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedPair.split('/')[0]}`
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Order Book & Recent Trades */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Book */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Order Book</h3>
            {orderBookLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="small" text="Loading..." />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Asks (Sell Orders) */}
                <div className="text-red-400 text-sm font-medium mb-2">Asks</div>
                {orderBook?.asks?.slice(0, 5).map((ask, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-red-400">{formatPrice(ask.price)}</span>
                    <span className="text-gray-300">{ask.quantity.toFixed(4)}</span>
                  </div>
                ))}
                
                {/* Spread */}
                <div className="border-t border-gray-600 my-2 pt-2">
                  <div className="text-center text-gray-400 text-sm">
                    Spread: {formatPrice((orderBook?.asks?.[0]?.price || 0) - (orderBook?.bids?.[0]?.price || 0))}
                  </div>
                </div>
                
                {/* Bids (Buy Orders) */}
                <div className="text-green-400 text-sm font-medium mb-2">Bids</div>
                {orderBook?.bids?.slice(0, 5).map((bid, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-green-400">{formatPrice(bid.price)}</span>
                    <span className="text-gray-300">{bid.quantity.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Trades */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
            {tradesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="small" text="Loading..." />
              </div>
            ) : (
              <div className="space-y-2">
                {recentTrades?.slice(0, 10).map((trade, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${trade.side === 'buy' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-white text-sm">{formatPrice(trade.price)}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{trade.quantity.toFixed(4)}</span>
                    <span className="text-gray-500 text-xs">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Orders */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Your Orders</h3>
        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="small" text="Loading orders..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Side</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userOrders?.length > 0 ? (
                  userOrders.map((order) => (
                    <tr key={order.id}>
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
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'filled' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>{new Date(order.createdAt).toLocaleString()}</td>
                      <td>
                        {order.status === 'pending' && (
                          <button className="text-red-400 hover:text-red-300 text-sm">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-400">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trading;