import { Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Settings({ store }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">設置</h1>
        <p className="text-gray-600 mt-1">配置您的AI SEO插件設置</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>應用設置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">設置功能</h3>
            <p className="text-gray-600">此功能正在開發中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

