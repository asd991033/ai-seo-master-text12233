# 🔧 Vercel配置修復指南

## 🎯 問題確認

從截圖分析發現兩個關鍵問題：

### ❌ 問題1: 構建配置錯誤
- Framework設置為 "Other"
- Build Command、Output Directory等都是默認值
- 沒有針對我們的Flask+React應用進行配置

### ❌ 問題2: 環境變量缺失
- Environment Variables頁面完全空白
- 缺少所有7個必要的環境變量

## 🚀 立即修復方案

### 第一步：修復構建配置

#### 在Build and Deployment頁面設置：

1. **Framework Preset**: 保持 "Other"
2. **Build Command**: 
   ```
   ./build-frontend.sh
   ```
3. **Output Directory**: 
   ```
   backend/src/static
   ```
4. **Install Command**: 
   ```
   npm install && pip install -r backend/requirements.txt
   ```
5. **Development Command**: 
   ```
   python backend/src/main.py
   ```

### 第二步：添加環境變量

#### 在Environment Variables頁面添加以下7個變量：

1. **SHOPIFY_CLIENT_ID**
   ```
   974d76b1ff7dd9787c9bc956433e6acc
   ```

2. **SHOPIFY_CLIENT_SECRET**
   ```
   7b4828707ebcdf89b17750d500f4c2be
   ```

3. **SHOPIFY_SCOPES**
   ```
   read_products,write_products,read_content,write_content,read_themes,write_themes
   ```

4. **APP_URL**
   ```
   https://ai-seo-master-text12233.vercel.app
   ```

5. **REDIRECT_URI**
   ```
   https://ai-seo-master-text12233.vercel.app/auth/callback
   ```

6. **FLASK_ENV**
   ```
   production
   ```

7. **SECRET_KEY**
   ```
   ai-seo-master-secret-key-2024
   ```

### 第三步：觸發重新部署

1. 保存所有設置
2. 回到Deployments頁面
3. 點擊 "Redeploy" 按鈕
4. 等待3-5分鐘完成部署

## ⚡ 操作順序

### 立即執行：
1. ✅ 修復Build and Deployment設置
2. ✅ 添加所有環境變量
3. ✅ 保存設置
4. ✅ 觸發重新部署
5. ✅ 測試應用訪問

## 🎯 預期結果

修復完成後：
- ✅ 應用能正常訪問
- ✅ 顯示AI SEO Master首頁
- ✅ 所有功能正常運行
- ✅ 準備進行OAuth測試

## 📞 支持

如果遇到任何問題：
1. 截圖錯誤信息
2. 檢查部署日誌
3. 確認所有設置正確

---

**按照這個指南操作，5分鐘內就能修復部署問題！**

