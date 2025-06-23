import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { ProductOptimizer } from './components/ProductOptimizer'
import { BlogGenerator } from './components/BlogGenerator'
import { PricingPage } from './components/PricingPage'
import './App.css'

function App() {
  const [currentStore, setCurrentStore] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate getting current store information
    const mockStore = {
      id: 1,
      shop_domain: 'demo-store.myshopify.com',
      plan_type: 'pro',
      settings: {
        language: 'en-US',
        auto_optimize: true
      }
    }
    
    setTimeout(() => {
      setCurrentStore(mockStore)
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar currentStore={currentStore} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard store={currentStore} />} />
            <Route path="/products" element={<ProductOptimizer store={currentStore} />} />
            <Route path="/blog" element={<BlogGenerator store={currentStore} />} />
            <Route path="/pricing" element={<PricingPage />} />
            {/* Redirect any other routes to dashboard */}
            <Route path="*" element={<Dashboard store={currentStore} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

