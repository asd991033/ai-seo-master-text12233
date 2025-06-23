import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Target, 
  Zap, 
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Search,
  Package,
  Globe,
  FileText,
  Image
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function Dashboard({ store }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call to get dashboard data
    const mockData = {
      overview: {
        total_tasks: 156,
        completed_tasks: 142,
        completion_rate: 91.0,
        total_keywords: 89,
        total_products: 234,
        avg_seo_score: 78.5,
        blog_articles: 45,
        generated_images: 128,
        supported_languages: 12
      },
      recent_tasks: [
        {
          id: 1,
          task_type: 'generate_title',
          status: 'completed',
          language: 'en',
          created_at: '2024-06-23T10:30:00Z'
        },
        {
          id: 2,
          task_type: 'generate_description',
          status: 'completed',
          language: 'es',
          created_at: '2024-06-23T10:25:00Z'
        },
        {
          id: 3,
          task_type: 'generate_blog',
          status: 'processing',
          language: 'fr',
          created_at: '2024-06-23T10:20:00Z'
        },
        {
          id: 4,
          task_type: 'generate_image',
          status: 'completed',
          language: 'de',
          created_at: '2024-06-23T10:15:00Z'
        }
      ],
      keyword_rankings: [
        {
          keyword: 'Premium Products',
          current_rank: 15,
          previous_rank: 18,
          change: 3,
          language: 'en'
        },
        {
          keyword: 'SEO Optimization',
          current_rank: 8,
          previous_rank: 12,
          change: 4,
          language: 'en'
        },
        {
          keyword: 'Professional Services',
          current_rank: 22,
          previous_rank: 20,
          change: -2,
          language: 'en'
        }
      ],
      traffic_trend: [
        { date: '06-19', organic_traffic: 1200 },
        { date: '06-20', organic_traffic: 1350 },
        { date: '06-21', organic_traffic: 1180 },
        { date: '06-22', organic_traffic: 1420 },
        { date: '06-23', organic_traffic: 1580 }
      ],
      language_distribution: [
        { language: 'English', code: 'en', percentage: 45, products: 105 },
        { language: 'Spanish', code: 'es', percentage: 20, products: 47 },
        { language: 'French', code: 'fr', percentage: 15, products: 35 },
        { language: 'German', code: 'de', percentage: 12, products: 28 },
        { language: 'Others', code: 'others', percentage: 8, products: 19 }
      ]
    }

    setTimeout(() => {
      setDashboardData(mockData)
      setLoading(false)
    }, 1000)
  }, [store])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { overview, recent_tasks, keyword_rankings, traffic_trend, language_distribution } = dashboardData

  const formatTaskType = (taskType) => {
    const types = {
      generate_title: 'Generate Title',
      generate_description: 'Generate Description',
      generate_blog: 'Generate Blog Article',
      generate_image: 'Generate Image',
      analyze_keywords: 'Keyword Analysis',
      seo_audit: 'SEO Audit'
    }
    return types[taskType] || taskType
  }

  const formatStatus = (status) => {
    const statuses = {
      completed: 'Completed',
      processing: 'Processing',
      pending: 'Pending',
      failed: 'Failed'
    }
    return statuses[status] || status
  }

  const getStatusColor = (status) => {
    const colors = {
      completed: 'text-green-600 bg-green-100',
      processing: 'text-blue-600 bg-blue-100',
      pending: 'text-yellow-600 bg-yellow-100',
      failed: 'text-red-600 bg-red-100'
    }
    return colors[status] || 'text-gray-600 bg-gray-100'
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SEO Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Monitor your SEO optimization progress and performance.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Start Optimization
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_tasks}</div>
            <p className="text-xs text-muted-foreground">
              {overview.completion_rate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keywords</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_keywords}</div>
            <p className="text-xs text-muted-foreground">
              Currently monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_products}</div>
            <p className="text-xs text-muted-foreground">
              Optimized products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg SEO Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avg_seo_score}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline w-3 h-3 mr-1" />
              +5.2% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blog Articles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.blog_articles}</div>
            <p className="text-xs text-muted-foreground">
              AI-generated articles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generated Images</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.generated_images}</div>
            <p className="text-xs text-muted-foreground">
              AI-created visuals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Languages</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.supported_languages}</div>
            <p className="text-xs text-muted-foreground">
              Supported languages
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Organic Traffic Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={traffic_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="organic_traffic" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Language Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {language_distribution.map((lang, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getLanguageFlag(lang.code)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{lang.language}</p>
                      <p className="text-sm text-gray-600">{lang.products} products</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{lang.percentage}%</p>
                    <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${lang.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Keyword Rankings */}
        <Card>
          <CardHeader>
            <CardTitle>Keyword Ranking Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {keyword_rankings.map((keyword, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getLanguageFlag(keyword.language)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{keyword.keyword}</p>
                      <p className="text-sm text-gray-600">Current rank: #{keyword.current_rank}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {keyword.change > 0 ? (
                      <div className="flex items-center text-green-600">
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-sm font-medium">+{keyword.change}</span>
                      </div>
                    ) : keyword.change < 0 ? (
                      <div className="flex items-center text-red-600">
                        <ArrowDown className="w-4 h-4" />
                        <span className="text-sm font-medium">{keyword.change}</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No change</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent_tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getLanguageFlag(task.language)}</span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatTaskType(task.task_type)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(task.created_at).toLocaleString('en-US')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {formatStatus(task.status)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

