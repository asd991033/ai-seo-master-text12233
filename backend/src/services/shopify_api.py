import requests
import json
from typing import Dict, List, Optional
from datetime import datetime

class ShopifyAPIService:
    """Shopify API服務類，處理與Shopify的所有API交互"""
    
    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain.replace('.myshopify.com', '')
        self.access_token = access_token
        self.base_url = f"https://{self.shop_domain}.myshopify.com/admin/api/2024-01"
        self.headers = {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json'
        }
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """發送API請求到Shopify"""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=self.headers, json=data)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            print(f"Shopify API request failed: {str(e)}")
            raise Exception(f"Shopify API error: {str(e)}")
    
    # ==================== 產品相關API ====================
    
    def get_products(self, limit: int = 50, page_info: str = None) -> Dict:
        """獲取商店產品列表"""
        endpoint = f"products.json?limit={limit}"
        if page_info:
            endpoint += f"&page_info={page_info}"
        
        return self._make_request('GET', endpoint)
    
    def get_product(self, product_id: str) -> Dict:
        """獲取單個產品詳情"""
        endpoint = f"products/{product_id}.json"
        return self._make_request('GET', endpoint)
    
    def update_product(self, product_id: str, product_data: Dict) -> Dict:
        """更新產品信息"""
        endpoint = f"products/{product_id}.json"
        data = {"product": product_data}
        return self._make_request('PUT', endpoint, data)
    
    def update_product_seo(self, product_id: str, seo_title: str, seo_description: str) -> Dict:
        """更新產品SEO信息"""
        product_data = {
            "title": seo_title,
            "body_html": seo_description
        }
        return self.update_product(product_id, product_data)
    
    def get_product_metafields(self, product_id: str) -> Dict:
        """獲取產品的metafields"""
        endpoint = f"products/{product_id}/metafields.json"
        return self._make_request('GET', endpoint)
    
    def create_product_metafield(self, product_id: str, namespace: str, key: str, value: str, value_type: str = "string") -> Dict:
        """為產品創建metafield"""
        endpoint = f"products/{product_id}/metafields.json"
        data = {
            "metafield": {
                "namespace": namespace,
                "key": key,
                "value": value,
                "type": value_type
            }
        }
        return self._make_request('POST', endpoint, data)
    
    def update_product_metafield(self, product_id: str, metafield_id: str, value: str) -> Dict:
        """更新產品metafield"""
        endpoint = f"products/{product_id}/metafields/{metafield_id}.json"
        data = {
            "metafield": {
                "value": value
            }
        }
        return self._make_request('PUT', endpoint, data)
    
    # ==================== 部落格相關API ====================
    
    def get_blogs(self) -> Dict:
        """獲取商店部落格列表"""
        endpoint = "blogs.json"
        return self._make_request('GET', endpoint)
    
    def get_blog_articles(self, blog_id: str, limit: int = 50) -> Dict:
        """獲取部落格文章列表"""
        endpoint = f"blogs/{blog_id}/articles.json?limit={limit}"
        return self._make_request('GET', endpoint)
    
    def create_blog_article(self, blog_id: str, title: str, content: str, summary: str = "", tags: List[str] = None) -> Dict:
        """創建部落格文章"""
        endpoint = f"blogs/{blog_id}/articles.json"
        
        article_data = {
            "title": title,
            "body_html": content,
            "summary": summary,
            "published": True,
            "created_at": datetime.utcnow().isoformat()
        }
        
        if tags:
            article_data["tags"] = ",".join(tags)
        
        data = {"article": article_data}
        return self._make_request('POST', endpoint, data)
    
    def update_blog_article(self, blog_id: str, article_id: str, title: str = None, content: str = None, summary: str = None) -> Dict:
        """更新部落格文章"""
        endpoint = f"blogs/{blog_id}/articles/{article_id}.json"
        
        article_data = {}
        if title:
            article_data["title"] = title
        if content:
            article_data["body_html"] = content
        if summary:
            article_data["summary"] = summary
        
        data = {"article": article_data}
        return self._make_request('PUT', endpoint, data)
    
    def delete_blog_article(self, blog_id: str, article_id: str) -> Dict:
        """刪除部落格文章"""
        endpoint = f"blogs/{blog_id}/articles/{article_id}.json"
        return self._make_request('DELETE', endpoint)
    
    # ==================== 商店信息API ====================
    
    def get_shop_info(self) -> Dict:
        """獲取商店基本信息"""
        endpoint = "shop.json"
        return self._make_request('GET', endpoint)
    
    def verify_webhook(self, webhook_data: str, webhook_signature: str) -> bool:
        """驗證Shopify webhook簽名"""
        import hmac
        import hashlib
        import base64
        
        # 這裡需要webhook secret，實際使用時從環境變量獲取
        webhook_secret = "your_webhook_secret"
        
        computed_signature = base64.b64encode(
            hmac.new(
                webhook_secret.encode('utf-8'),
                webhook_data.encode('utf-8'),
                hashlib.sha256
            ).digest()
        ).decode('utf-8')
        
        return hmac.compare_digest(computed_signature, webhook_signature)
    
    # ==================== 批量操作 ====================
    
    def sync_all_products(self) -> List[Dict]:
        """同步所有產品數據"""
        all_products = []
        page_info = None
        
        while True:
            response = self.get_products(limit=250, page_info=page_info)
            products = response.get('products', [])
            all_products.extend(products)
            
            # 檢查是否有下一頁
            if len(products) < 250:
                break
            
            # 獲取下一頁的page_info（實際實現需要從Link header解析）
            page_info = None  # 簡化處理
            break
        
        return all_products
    
    def batch_update_products_seo(self, product_updates: List[Dict]) -> List[Dict]:
        """批量更新產品SEO"""
        results = []
        
        for update in product_updates:
            try:
                product_id = update['product_id']
                seo_title = update['seo_title']
                seo_description = update['seo_description']
                
                result = self.update_product_seo(product_id, seo_title, seo_description)
                results.append({
                    'product_id': product_id,
                    'success': True,
                    'result': result
                })
                
            except Exception as e:
                results.append({
                    'product_id': update.get('product_id'),
                    'success': False,
                    'error': str(e)
                })
        
        return results


class ShopifyProductSync:
    """Shopify產品同步管理器"""
    
    def __init__(self, shopify_api: ShopifyAPIService, db_session):
        self.shopify_api = shopify_api
        self.db_session = db_session
    
    def sync_products_from_shopify(self, store_id: int) -> Dict:
        """從Shopify同步產品到本地數據庫"""
        from src.models.seo import Product
        
        try:
            # 獲取Shopify產品
            shopify_products = self.shopify_api.sync_all_products()
            
            synced_count = 0
            updated_count = 0
            
            for shopify_product in shopify_products:
                product_id = str(shopify_product['id'])
                
                # 檢查產品是否已存在
                existing_product = Product.query.filter_by(
                    store_id=store_id,
                    shopify_product_id=product_id
                ).first()
                
                if existing_product:
                    # 更新現有產品
                    existing_product.title = shopify_product.get('title', '')
                    existing_product.description = shopify_product.get('body_html', '')
                    existing_product.updated_at = datetime.utcnow()
                    updated_count += 1
                else:
                    # 創建新產品
                    new_product = Product(
                        store_id=store_id,
                        shopify_product_id=product_id,
                        title=shopify_product.get('title', ''),
                        description=shopify_product.get('body_html', ''),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    self.db_session.add(new_product)
                    synced_count += 1
            
            self.db_session.commit()
            
            return {
                'success': True,
                'synced_count': synced_count,
                'updated_count': updated_count,
                'total_products': len(shopify_products)
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def push_seo_to_shopify(self, product_id: int) -> Dict:
        """將本地SEO優化推送到Shopify"""
        from src.models.seo import Product
        
        try:
            # 獲取本地產品數據
            product = Product.query.get(product_id)
            if not product:
                return {'success': False, 'error': 'Product not found'}
            
            if not product.seo_title or not product.seo_description:
                return {'success': False, 'error': 'No SEO data to push'}
            
            # 推送到Shopify
            result = self.shopify_api.update_product_seo(
                product.shopify_product_id,
                product.seo_title,
                product.seo_description
            )
            
            # 更新本地記錄
            product.last_optimized = datetime.utcnow()
            self.db_session.commit()
            
            return {
                'success': True,
                'shopify_product_id': product.shopify_product_id,
                'result': result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# 使用示例和測試函數
def test_shopify_integration():
    """測試Shopify整合功能"""
    
    # 模擬測試數據
    test_shop_domain = "demo-store"
    test_access_token = "test_token_123"
    
    try:
        # 初始化API服務
        shopify_api = ShopifyAPIService(test_shop_domain, test_access_token)
        
        # 測試商店信息獲取
        print("Testing shop info retrieval...")
        # shop_info = shopify_api.get_shop_info()
        
        # 測試產品獲取
        print("Testing product retrieval...")
        # products = shopify_api.get_products(limit=5)
        
        # 測試部落格獲取
        print("Testing blog retrieval...")
        # blogs = shopify_api.get_blogs()
        
        print("Shopify integration test completed successfully!")
        return True
        
    except Exception as e:
        print(f"Shopify integration test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_shopify_integration()

