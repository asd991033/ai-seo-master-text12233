# AI SEO Master - Token消耗收費規劃

## 概述

本文檔詳細規劃了AI SEO Master插件的token消耗機制、收費策略和技術實現方案，確保商業模式的可持續性和用戶體驗的平衡。

---

## 🎯 Token消耗機制設計

### 基本原則
1. **透明計費**: 用戶清楚知道每個操作的token消耗
2. **合理定價**: 基於實際AI API成本和市場競爭力
3. **靈活套餐**: 提供多種套餐滿足不同用戶需求
4. **使用追蹤**: 實時顯示token使用情況和剩餘額度

### Token消耗標準

#### 1. AI標題生成
- **消耗**: 50 Credits
- **DeepSeek API成本**: ~$0.002
- **毛利率**: 75%
- **生成內容**: 5個優化標題選項
- **平均處理時間**: 10-15秒

#### 2. AI描述生成
- **消耗**: 100 Credits  
- **DeepSeek API成本**: ~$0.005
- **毛利率**: 70%
- **生成內容**: 詳細產品描述 (200-400字)
- **平均處理時間**: 15-25秒

#### 3. AI部落格文章生成
- **短文章** (300-500字): 200 Credits
- **中等文章** (500-800字): 400 Credits
- **長文章** (800-1200字): 600 Credits
- **DeepSeek API成本**: $0.008-$0.025
- **毛利率**: 68-72%
- **平均處理時間**: 20-45秒

#### 4. SEO審計分析
- **消耗**: 30 Credits
- **DeepSeek API成本**: ~$0.001
- **毛利率**: 80%
- **分析內容**: SEO分數、改進建議
- **平均處理時間**: 5-10秒

#### 5. 關鍵詞生成
- **消耗**: 25 Credits
- **DeepSeek API成本**: ~$0.001
- **毛利率**: 82%
- **生成內容**: 10-20個相關關鍵詞
- **平均處理時間**: 5-8秒

#### 6. 語言偵測
- **消耗**: 5 Credits
- **DeepSeek API成本**: ~$0.0005
- **毛利率**: 85%
- **處理內容**: 自動偵測文本語言
- **平均處理時間**: 2-3秒

---

## 💰 定價套餐策略

### 1. Starter Plan (免費)
- **月度Credits**: 100
- **適用功能**: 
  - AI標題生成: 2次
  - AI描述生成: 1次
  - SEO審計: 3次
  - 關鍵詞生成: 4次
- **目標用戶**: 小型商家、試用用戶
- **轉換策略**: 限制功能引導升級

### 2. Growth Plan ($29/月)
- **月度Credits**: 800
- **適用功能**: 全部功能
- **預估使用**:
  - AI標題生成: 8次 (400 Credits)
  - AI描述生成: 3次 (300 Credits)
  - 部落格文章: 1篇中等 (400 Credits)
  - SEO審計: 無限制
- **目標用戶**: 中小型電商
- **價值主張**: 每月可優化15-20個產品

### 3. Professional Plan ($79/月)
- **月度Credits**: 2500
- **適用功能**: 全部功能 + 優先支持
- **預估使用**:
  - AI標題生成: 20次 (1000 Credits)
  - AI描述生成: 10次 (1000 Credits)
  - 部落格文章: 3篇中等 (1200 Credits)
  - SEO審計: 無限制
- **目標用戶**: 成長型電商
- **價值主張**: 每月可優化50個產品 + 3篇部落格

### 4. Enterprise Plan ($199/月)
- **月度Credits**: 8000
- **適用功能**: 全部功能 + 專屬客服 + API訪問
- **預估使用**:
  - AI標題生成: 60次 (3000 Credits)
  - AI描述生成: 30次 (3000 Credits)
  - 部落格文章: 10篇混合 (4000 Credits)
  - SEO審計: 無限制
- **目標用戶**: 大型電商、代理商
- **價值主張**: 每月可優化150個產品 + 10篇部落格

---

## 🔧 技術實現方案

### 1. Credits系統架構

#### 數據庫設計
```sql
-- 用戶Credits表
CREATE TABLE user_credits (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    total_credits INTEGER NOT NULL,
    used_credits INTEGER DEFAULT 0,
    remaining_credits INTEGER NOT NULL,
    reset_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credits使用記錄表
CREATE TABLE credit_transactions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task_type VARCHAR(100) NOT NULL,
    credits_consumed INTEGER NOT NULL,
    api_cost DECIMAL(10,6),
    task_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 套餐配置表
CREATE TABLE subscription_plans (
    id INTEGER PRIMARY KEY,
    plan_name VARCHAR(50) NOT NULL,
    monthly_credits INTEGER NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    features JSON,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 後端API實現
```python
class CreditManager:
    def __init__(self, user_id):
        self.user_id = user_id
    
    def check_credits(self, required_credits):
        """檢查用戶是否有足夠的Credits"""
        user_credits = self.get_user_credits()
        return user_credits.remaining_credits >= required_credits
    
    def consume_credits(self, task_type, credits_amount, api_cost=0):
        """消耗Credits並記錄"""
        if not self.check_credits(credits_amount):
            raise InsufficientCreditsError("Not enough credits")
        
        # 更新用戶Credits
        self.update_user_credits(-credits_amount)
        
        # 記錄消耗
        self.log_transaction(task_type, credits_amount, api_cost)
    
    def reset_monthly_credits(self):
        """每月重置Credits"""
        user = self.get_user()
        plan = self.get_plan(user.plan_type)
        self.update_user_credits(plan.monthly_credits, reset=True)
```

### 2. 前端Credits顯示

#### Credits儀表板組件
```jsx
function CreditsDisplay({ userCredits }) {
  const usagePercentage = (userCredits.used_credits / userCredits.total_credits) * 100;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-semibold mb-2">Credits Usage</h3>
      <div className="flex justify-between mb-2">
        <span>{userCredits.remaining_credits} remaining</span>
        <span>{userCredits.total_credits} total</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full" 
          style={{ width: `${usagePercentage}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Resets on {userCredits.reset_date}
      </p>
    </div>
  );
}
```

### 3. 實時Credits檢查

#### API調用前檢查
```javascript
async function generateTitle(productData) {
  const requiredCredits = 50;
  
  // 檢查Credits
  const creditsCheck = await fetch('/api/credits/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ required_credits: requiredCredits })
  });
  
  if (!creditsCheck.ok) {
    throw new Error('Insufficient credits');
  }
  
  // 執行AI生成
  const response = await fetch('/api/seo/generate-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  });
  
  return response.json();
}
```

---

## 📊 收入預測模型

### 月度收入預測

#### 保守估計 (第一年)
- **Starter用戶**: 1000人 × $0 = $0
- **Growth用戶**: 200人 × $29 = $5,800
- **Professional用戶**: 100人 × $79 = $7,900
- **Enterprise用戶**: 20人 × $199 = $3,980
- **月度總收入**: $17,680
- **年度收入**: $212,160

#### 樂觀估計 (第二年)
- **Starter用戶**: 2500人 × $0 = $0
- **Growth用戶**: 500人 × $29 = $14,500
- **Professional用戶**: 300人 × $79 = $23,700
- **Enterprise用戶**: 80人 × $199 = $15,920
- **月度總收入**: $54,120
- **年度收入**: $649,440

### 成本結構分析

#### 每月運營成本
- **DeepSeek AI API**: ~$3,500 (基於使用量)
- **服務器託管**: $200
- **Shopify合作夥伴費用**: 20% × 收入
- **客服支持**: $1,500
- **營銷推廣**: $2,000
- **總運營成本**: ~$7,200

#### 毛利率計算
- **第一年毛利率**: ($17,680 - $7,200) / $17,680 = 59.3%
- **第二年毛利率**: ($54,120 - $12,000) / $54,120 = 77.8%

---

## 🎯 用戶體驗優化

### 1. Credits使用透明度
- **實時顯示**: 每個操作前顯示所需Credits
- **使用歷史**: 詳細的Credits使用記錄
- **剩餘提醒**: 當Credits不足時主動提醒
- **升級建議**: 基於使用模式推薦合適套餐

### 2. 免費用戶轉換策略
- **功能預覽**: 讓免費用戶體驗高級功能
- **使用案例**: 展示成功的SEO優化案例
- **限時優惠**: 首次升級享受折扣
- **漸進式限制**: 逐步引導而非強制升級

### 3. 付費用戶留存
- **價值展示**: 定期報告SEO改進效果
- **新功能優先**: 付費用戶優先體驗新功能
- **專屬支持**: 提供優質客服體驗
- **社群建設**: 建立用戶交流社群

---

## 🔒 安全與防濫用

### 1. API調用限制
- **頻率限制**: 每分鐘最多10次API調用
- **IP限制**: 檢測異常IP活動
- **用戶驗證**: 確保合法Shopify商家
- **Credits驗證**: 雙重檢查Credits餘額

### 2. 濫用檢測
- **異常模式**: 檢測不正常的使用模式
- **重複內容**: 防止重複生成相同內容
- **帳戶共享**: 檢測多人共用帳戶
- **自動封禁**: 自動處理濫用行為

---

## 📈 未來擴展計劃

### 1. 新功能定價
- **AI圖片生成**: 150 Credits/張
- **多語言翻譯**: 20 Credits/100字
- **競爭對手分析**: 200 Credits/報告
- **自動化SEO**: 500 Credits/月

### 2. 企業級功能
- **API訪問**: 額外$99/月
- **白標解決方案**: 額外$299/月
- **專屬部署**: 定制報價
- **培訓服務**: $199/小時

### 3. 合作夥伴計劃
- **代理商折扣**: 20-30%折扣
- **推薦獎勵**: 首月收入的30%
- **技術整合**: 與其他工具整合
- **聯合營銷**: 共同推廣活動

---

## 🎯 實施時間表

### 第一階段 (1-2週)
- ✅ 基礎Credits系統實現
- ✅ 前端Credits顯示
- ✅ API調用前檢查
- ✅ 基本套餐配置

### 第二階段 (3-4週)
- 🔄 Shopify支付整合
- 🔄 自動訂閱管理
- 🔄 Credits使用分析
- 🔄 用戶升級流程

### 第三階段 (5-6週)
- 📋 高級分析報告
- 📋 濫用檢測系統
- 📋 客服支持系統
- 📋 營銷自動化

---

## 📋 總結

本token消耗收費規劃提供了：

1. **清晰的定價結構**: 基於實際成本和市場競爭力
2. **技術實現方案**: 完整的後端和前端實現
3. **收入預測模型**: 保守和樂觀的財務預測
4. **用戶體驗優化**: 平衡商業目標和用戶滿意度
5. **安全防護機制**: 防止濫用和確保系統穩定
6. **未來擴展計劃**: 可持續的商業增長策略

這個規劃確保了AI SEO Master插件的商業可行性，同時為用戶提供了透明、公平的定價模式。

