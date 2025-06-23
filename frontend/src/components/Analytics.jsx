import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Analytics({ store }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">分析報告</h1>
        <p className="text-gray-600 mt-1">查看詳細的SEO分析和報告</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>SEO分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">分析報告功能</h3>
            <p className="text-gray-600">此功能正在開發中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

