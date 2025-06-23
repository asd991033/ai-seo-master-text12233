import { useState } from 'react'
import { FileText, Zap, Image, Sparkles, Globe, Eye, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export function BlogGenerator({ store }) {
  const [formData, setFormData] = useState({
    topic: '',
    keywords: '',
    language: 'en',
    length: 'medium',
    includeImages: true  // 新增圖片生成選項
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedArticle, setGeneratedArticle] = useState(null)
  const [error, setError] = useState('')

  const languages = [
    { code: 'en', name: '🇺🇸 English', flag: '🇺🇸' },
    { code: 'es', name: '🇪🇸 Spanish', flag: '🇪🇸' },
    { code: 'fr', name: '🇫🇷 French', flag: '🇫🇷' },
    { code: 'de', name: '🇩🇪 German', flag: '🇩🇪' },
    { code: 'zh', name: '🇨🇳 Chinese', flag: '🇨🇳' }
  ]

  const lengthOptions = [
    { value: 'short', label: 'Short (300-500 words)', credits: 25 },
    { value: 'medium', label: 'Medium (500-800 words)', credits: 50 },
    { value: 'long', label: 'Long (800-1200 words)', credits: 100 }
  ]

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const getCreditsRequired = () => {
    const baseCredits = lengthOptions.find(opt => opt.value === formData.length)?.credits || 50
    const imageCredits = formData.includeImages ? 30 : 0  // 圖片生成費用大幅降低
    return baseCredits + imageCredits
  }

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      setError('Please enter an article topic')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const response = await fetch('http://localhost:5003/api/blog/generate-from-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: store?.id || 1,
          blog_id: 'main-blog',  // 默認部落格ID
          topic: formData.topic,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
          language: formData.language,
          length: formData.length,
          include_images: formData.includeImages
        })
      })

      const result = await response.json()

      if (result.success) {
        setGeneratedArticle(result)
        // 重置表單
        setFormData({
          topic: '',
          keywords: '',
          language: 'en',
          length: 'medium',
          includeImages: true
        })
      } else {
        setError(result.error || 'Failed to generate article')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 模擬歷史文章數據
  const recentArticles = [
    {
      id: 1,
      title: "Benefits of Smart Watches for Fitness",
      seo_score: 95,
      language: "en",
      word_count: 363,
      length: "medium",
      created_at: "Jun 23, 2024, 10:20 AM",
      has_images: true,
      image_count: 3
    },
    {
      id: 2,
      title: "Beneficios de los Relojes Inteligentes",
      seo_score: 88,
      language: "es", 
      word_count: 287,
      length: "short",
      created_at: "Jun 23, 2024, 09:15 AM",
      has_images: true,
      image_count: 2
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Blog Article Generator</h1>
        <p className="text-gray-600">Generate SEO-optimized blog articles with AI-generated images across multiple languages</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Zap className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold">Generate Article</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Topic *
              </label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="e.g., Benefits of Smart Watches for Fitness"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Keywords (optional)
              </label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                placeholder="smart watch, fitness, health monitoring"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Length
              </label>
              <select
                name="length"
                value={formData.length}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {lengthOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.credits} Credits
                  </option>
                ))}
              </select>
            </div>

            {/* 新增圖片生成選項 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeImages"
                  name="includeImages"
                  checked={formData.includeImages}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="includeImages" className="ml-3 flex items-center">
                  <Image className="h-4 w-4 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">
                    Generate AI Images (+30 Credits)
                  </span>
                  <Sparkles className="h-4 w-4 text-yellow-500 ml-1" />
                </label>
              </div>
              <p className="text-xs text-gray-600 mt-2 ml-7">
                Automatically generate and insert relevant images to boost SEO score by up to 15 points
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !formData.topic.trim()}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Article ({getCreditsRequired()} Credits)
                </>
              )}
            </button>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Credits Required:</strong> {getCreditsRequired()}
              </p>
              <p className="text-sm text-blue-600">
                Your current plan: Professional (2500 Credits/month)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Generated Article Preview or Recent Articles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {generatedArticle ? (
            <div>
              <div className="flex items-center mb-4">
                <FileText className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-lg font-semibold">Generated Article</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    {generatedArticle.article.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-green-600">
                    <span>SEO: {generatedArticle.generation_result.seo_score}/100</span>
                    <span>{languages.find(l => l.code === generatedArticle.article.language)?.flag} {languages.find(l => l.code === generatedArticle.article.language)?.name.split(' ')[1]}</span>
                    <span>{generatedArticle.generation_result.word_count} words</span>
                    {generatedArticle.image_count > 0 && (
                      <span className="flex items-center">
                        <Image className="h-3 w-3 mr-1" />
                        {generatedArticle.image_count} images
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    {new Date().toLocaleString()}
                  </p>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: generatedArticle.generation_result.content.substring(0, 300) + '...' 
                    }} 
                  />
                </div>
                
                {generatedArticle.warning && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-700">{generatedArticle.warning}</p>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
                    Publish to Shopify
                  </button>
                  <button className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700">
                    Edit Article
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center mb-4">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold">No Article Generated Yet</h2>
              </div>
              
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">
                  Fill in the form on the left and click "Generate Article" to create your first AI-powered blog post with images.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Articles */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Articles</h2>
        
        <div className="space-y-4">
          {recentArticles.map(article => (
            <div key={article.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">{article.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      SEO: {article.seo_score}/100
                    </span>
                    <span>{languages.find(l => l.code === article.language)?.flag} {languages.find(l => l.code === article.language)?.name.split(' ')[1]}</span>
                    <span>{article.word_count} words • {article.length} length</span>
                    {article.has_images && (
                      <span className="flex items-center text-purple-600">
                        <Image className="h-3 w-3 mr-1" />
                        {article.image_count} images
                      </span>
                    )}
                    <span>{article.created_at}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

