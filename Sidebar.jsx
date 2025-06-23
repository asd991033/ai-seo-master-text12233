import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  FileText,
  Zap,
  Crown,
  CreditCard
} from 'lucide-react'

export function Sidebar({ currentStore }) {
  const location = useLocation()
  
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/products', icon: Package, label: 'Product Optimization' },
    { path: '/blog', icon: FileText, label: 'Blog Generator' },
    { path: '/pricing', icon: CreditCard, label: 'Pricing & Plans' }
  ]

  const isActive = (path) => {
    return location.pathname === path
  }

  const getPlanBadge = (planType) => {
    const badges = {
      free: { label: 'Free (50 Credits)', color: 'bg-gray-100 text-gray-800' },
      starter: { label: 'Starter ($9.99)', color: 'bg-green-100 text-green-800' },
      pro: { label: 'Professional ($19.99)', color: 'bg-blue-100 text-blue-800' },
      enterprise: { label: 'Enterprise ($49.99)', color: 'bg-purple-100 text-purple-800' }
    }
    return badges[planType] || badges.pro
  }

  const planBadge = getPlanBadge(currentStore?.plan_type)

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI SEO Master</h1>
            <p className="text-sm text-gray-500">Smart SEO Optimization</p>
          </div>
        </div>
      </div>

      {/* Store Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Current Store</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${planBadge.color}`}>
              {planBadge.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">
            {currentStore?.shop_domain}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Pricing Highlight */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Crown className="w-4 h-4 mr-2 text-blue-600" />
            New Low Prices!
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>🎉 Starter: Only $9.99/month</li>
            <li>⚡ Professional: Only $19.99/month</li>
            <li>🆕 AI Image Generation</li>
            <li>🌍 5 Languages Support</li>
          </ul>
          <Link 
            to="/pricing" 
            className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All Plans →
          </Link>
        </div>
      </div>

      {/* Upgrade Banner */}
      {currentStore?.plan_type === 'free' && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-5 h-5" />
              <span className="font-semibold">Upgrade to Pro</span>
            </div>
            <p className="text-sm text-blue-100 mb-3">
              Unlock more AI features and unlimited optimizations
            </p>
            <button className="w-full bg-white text-blue-600 py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors">
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          © 2024 AI SEO Master
        </p>
      </div>
    </div>
  )
}

