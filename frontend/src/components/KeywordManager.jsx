import { useState } from 'react'
import { Search, TrendingUp, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function KeywordManager({ store }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">關鍵詞管理</h1>
        <p className="text-gray-600 mt-1">管理和監控您的SEO關鍵詞表現</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>關鍵詞概覽</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">關鍵詞管理功能</h3>
            <p className="text-gray-600">此功能正在開發中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

