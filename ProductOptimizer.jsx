import { useState, useEffect } from 'react'
import { 
  Search, 
  Wand2, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Globe
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function ProductOptimizer({ store }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [optimizing, setOptimizing] = useState(false)
  const [filter, setFilter] = useState('all') // all, optimized, unoptimized

  useEffect(() => {
    // Simulate getting product data
    const mockProducts = [
      {
        id: 1,
        shopify_product_id: 'prod_001',
        title: 'Premium Wireless Bluetooth Headphones',
        description: 'High-quality wireless Bluetooth headphones with crystal clear sound and comfortable fit.',
        seo_title: 'AI Optimized: Premium Wireless Bluetooth Headphones | Crystal Clear Sound | Comfortable Fit',
        seo_description: 'Professional AI-optimized product description with relevant keywords. High-quality wireless Bluetooth headphones with crystal clear sound and comfortable fit. Premium quality, trusted brand.',
        seo_score: 85.5,
        last_optimized: '2024-06-23T10:30:00Z',
        status: 'optimized',
        language: 'en'
      },
      {
        id: 2,
        shopify_product_id: 'prod_002',
        title: 'Smart Watch Sports Edition',
        description: 'Multi-functional smart watch with sports monitoring and health tracking features.',
        seo_title: null,
        seo_description: null,
        seo_score: 60.2,
        last_optimized: '2024-06-23T10:25:00Z',
        status: 'optimized',
        language: 'en'
      },
      {
        id: 3,
        shopify_product_id: 'prod_003',
        title: 'Portable Power Bank',
        description: 'High-capacity portable power bank with fast charging and reliable safety features.',
        seo_title: 'AI Optimized: Portable Power Bank | High Capacity Fast Charging | Safe & Reliable',
        seo_description: 'Professional AI-optimized product description with relevant keywords. High-capacity portable power bank with fast charging and reliable safety features. Premium quality, trusted brand.',
        seo_score: 78.9,
        last_optimized: '2024-06-22T15:20:00Z',
        status: 'optimized',
        language: 'en'
      },
      {
        id: 4,
        shopify_product_id: 'prod_004',
        title: 'Reloj Inteligente Deportivo',
        description: 'Reloj inteligente multifuncional con monitoreo deportivo y seguimiento de salud.',
        seo_title: null,
        seo_description: null,
        seo_score: 42.1,
        last_optimized: null,
        status: 'unoptimized',
        language: 'es'
      },
      {
        id: 5,
        shopify_product_id: 'prod_005',
        title: 'Écouteurs Bluetooth Sans Fil',
        description: 'Écouteurs Bluetooth sans fil de haute qualité avec son cristallin et ajustement confortable.',
        seo_title: null,
        seo_description: null,
        seo_score: 38.7,
        last_optimized: null,
        status: 'unoptimized',
        language: 'fr'
      }
    ]

    setTimeout(() => {
      setProducts(mockProducts)
      setLoading(false)
    }, 1000)
  }, [store])

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filter === 'optimized') {
      return matchesSearch && product.status === 'optimized'
    } else if (filter === 'unoptimized') {
      return matchesSearch && product.status === 'unoptimized'
    }
    
    return matchesSearch
  })

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId)
      } else {
        return [...prev, productId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id))
    }
  }

  const handleBulkOptimize = async () => {
    if (selectedProducts.length === 0) return
    
    setOptimizing(true)
    
    // Simulate API call for bulk optimization
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update products status
      setProducts(prev => prev.map(product => {
        if (selectedProducts.includes(product.id)) {
          return {
            ...product,
            status: 'optimized',
            seo_score: Math.min(product.seo_score + Math.random() * 20, 95),
            last_optimized: new Date().toISOString(),
            seo_title: `AI Optimized: ${product.title} | Enhanced SEO`,
            seo_description: `Professional AI-optimized description for ${product.title}. Enhanced with relevant keywords and improved readability.`
          }
        }
        return product
      }))
      
      setSelectedProducts([])
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setOptimizing(false)
    }
  }

  const getLanguageFlag = (langCode) => {
    const flags = {
      en: '🇺🇸',
      es: '🇪🇸',
      fr: '🇫🇷',
      de: '🇩🇪',
      zh: '🇨🇳',
      ja: '🇯🇵',
      ko: '🇰🇷',
      it: '🇮🇹',
      pt: '🇵🇹',
      ru: '🇷🇺'
    }
    return flags[langCode] || '🌐'
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Optimization</h1>
          <p className="text-gray-600 mt-1">
            Use AI technology to optimize your product SEO performance across multiple languages
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button 
            onClick={handleBulkOptimize}
            disabled={selectedProducts.length === 0 || optimizing}
          >
            {optimizing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Bulk Optimize ({selectedProducts.length})
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'optimized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('optimized')}
          >
            Optimized
          </Button>
          <Button
            variant={filter === 'unoptimized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unoptimized')}
          >
            Unoptimized
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            Select All
          </Button>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Products ({filteredProducts.length})
          </h2>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>

        {filteredProducts.map((product) => (
          <Card key={product.id} className={`transition-all ${selectedProducts.includes(product.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleProductSelect(product.id)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getLanguageFlag(product.language)}</span>
                      <CardTitle className="text-lg">{product.title}</CardTitle>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">ID: {product.shopify_product_id}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={product.status === 'optimized' ? 'default' : 'secondary'}
                    className={product.status === 'optimized' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                  >
                    {product.status === 'optimized' ? 'Optimized' : 'Unoptimized'}
                  </Badge>
                  <Badge className={getScoreColor(product.seo_score)}>
                    SEO: {product.seo_score}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Content */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Original Content</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Title:</label>
                      <p className="text-sm text-gray-600 mt-1">{product.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Description:</label>
                      <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                    </div>
                  </div>
                </div>

                {/* AI Optimized Content */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">AI Optimized Content</h4>
                  {product.status === 'optimized' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Optimized Title:</label>
                        <p className="text-sm text-gray-600 mt-1 bg-green-50 p-2 rounded">
                          {product.seo_title}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Optimized Description:</label>
                        <p className="text-sm text-gray-600 mt-1 bg-green-50 p-2 rounded">
                          {product.seo_description}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        Last optimized: {new Date(product.last_optimized).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Not optimized yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Optimize
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  )
}

