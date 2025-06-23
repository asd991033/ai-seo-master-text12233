import { useState } from 'react'
import { PenTool, Wand2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ContentGenerator({ store }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">內容生成器</h1>
        <p className="text-gray-600 mt-1">使用AI生成SEO優化的內容</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>AI內容生成</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <PenTool className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">內容生成功能</h3>
            <p className="text-gray-600">此功能正在開發中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

