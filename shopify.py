from flask import Blueprint, request, jsonify
from src.services.shopify_api import ShopifyAPIService, ShopifyProductSync
from src.models.seo import Store, Product
from src.models.user import db
import json
from datetime import datetime

shopify_bp = Blueprint('shopify', __name__)

@shopify_bp.route('/health', methods=['GET'])
def health_check():
    """Shopify API健康檢查"""
    return jsonify({
        "service": "Shopify Integration",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    })

@shopify_bp.route('/connect', methods=['POST'])
def connect_shopify():
    """連接Shopify商店"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        shop_domain = data.get('shop_domain')
        access_token = data.get('access_token')
        
        if not shop_domain or not access_token:
            return jsonify({"error": "Shop domain and access token are required"}), 400
        
        # 測試Shopify連接
        shopify_api = ShopifyAPIService(shop_domain, access_token)
        
        try:
            shop_info = shopify_api.get_shop_info()
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to connect to Shopify: {str(e)}"
            }), 400
        
        # 檢查商店是否已存在
        existing_store = Store.query.filter_by(shop_domain=shop_domain).first()
        
        if existing_store:
            # 更新現有商店
            existing_store.access_token = access_token
            existing_store.updated_at = datetime.utcnow()
            store = existing_store
        else:
            # 創建新商店
            store = Store(
                shop_domain=shop_domain,
                access_token=access_token,
                plan_type='free',
                settings=json.dumps({
                    'language': 'en-US',
                    'auto_optimize': False
                })
            )
            db.session.add(store)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "store": store.to_dict(),
            "shop_info": shop_info
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": f"Connection failed: {str(e)}"
        }), 500

@shopify_bp.route('/sync-products', methods=['POST'])
def sync_products():
    """同步Shopify產品到本地數據庫"""
    try:
        data = request.get_json()
        store_id = data.get('store_id')
        
        if not store_id:
            return jsonify({"error": "Store ID is required"}), 400
        
        # 獲取商店信息
        store = Store.query.get(store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化Shopify API
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        product_sync = ShopifyProductSync(shopify_api, db.session)
        
        # 執行同步
        result = product_sync.sync_products_from_shopify(store_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Sync failed: {str(e)}"
        }), 500

@shopify_bp.route('/products', methods=['GET'])
def get_synced_products():
    """獲取已同步的產品列表"""
    try:
        store_id = request.args.get('store_id')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        if not store_id:
            return jsonify({"error": "Store ID is required"}), 400
        
        # 查詢產品
        products_query = Product.query.filter_by(store_id=store_id)
        total = products_query.count()
        
        products = products_query.offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            "success": True,
            "products": [product.to_dict() for product in products],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to get products: {str(e)}"
        }), 500

@shopify_bp.route('/products/<int:product_id>/optimize', methods=['POST'])
def optimize_product():
    """優化產品SEO並推送到Shopify"""
    try:
        data = request.get_json()
        
        # 獲取產品
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # 獲取商店信息
        store = Store.query.get(product.store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 這裡可以調用AI優化服務
        # 暫時使用傳入的數據
        seo_title = data.get('seo_title')
        seo_description = data.get('seo_description')
        
        if not seo_title or not seo_description:
            return jsonify({"error": "SEO title and description are required"}), 400
        
        # 更新本地產品數據
        product.seo_title = seo_title
        product.seo_description = seo_description
        product.last_optimized = datetime.utcnow()
        
        # 推送到Shopify
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        product_sync = ShopifyProductSync(shopify_api, db.session)
        
        push_result = product_sync.push_seo_to_shopify(product_id)
        
        if push_result['success']:
            db.session.commit()
            return jsonify({
                "success": True,
                "product": product.to_dict(),
                "shopify_result": push_result
            })
        else:
            db.session.rollback()
            return jsonify({
                "success": False,
                "error": f"Failed to push to Shopify: {push_result['error']}"
            }), 500
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": f"Optimization failed: {str(e)}"
        }), 500

@shopify_bp.route('/products/<int:product_id>/push', methods=['POST'])
def push_product_to_shopify():
    """將本地優化的產品推送到Shopify"""
    try:
        # 獲取產品
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        
        # 獲取商店信息
        store = Store.query.get(product.store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化Shopify API
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        product_sync = ShopifyProductSync(shopify_api, db.session)
        
        # 推送到Shopify
        result = product_sync.push_seo_to_shopify(product_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Push failed: {str(e)}"
        }), 500

@shopify_bp.route('/webhook/products/update', methods=['POST'])
def handle_product_webhook():
    """處理Shopify產品更新webhook"""
    try:
        # 驗證webhook簽名
        webhook_signature = request.headers.get('X-Shopify-Hmac-Sha256')
        webhook_data = request.get_data(as_text=True)
        
        # 這裡應該驗證webhook簽名
        # shopify_api = ShopifyAPIService("", "")
        # if not shopify_api.verify_webhook(webhook_data, webhook_signature):
        #     return jsonify({"error": "Invalid webhook signature"}), 401
        
        product_data = request.get_json()
        
        # 查找對應的本地產品
        shopify_product_id = str(product_data.get('id'))
        product = Product.query.filter_by(shopify_product_id=shopify_product_id).first()
        
        if product:
            # 更新本地產品數據
            product.title = product_data.get('title', product.title)
            product.description = product_data.get('body_html', product.description)
            product.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({"success": True, "message": "Product updated"})
        else:
            return jsonify({"success": True, "message": "Product not found locally"})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": f"Webhook processing failed: {str(e)}"
        }), 500

@shopify_bp.route('/stores/<int:store_id>/status', methods=['GET'])
def get_store_status():
    """獲取商店同步狀態"""
    try:
        store = Store.query.get(store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 統計產品數據
        total_products = Product.query.filter_by(store_id=store_id).count()
        optimized_products = Product.query.filter_by(store_id=store_id).filter(
            Product.seo_title.isnot(None),
            Product.seo_description.isnot(None)
        ).count()
        
        # 測試Shopify連接
        try:
            shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
            shop_info = shopify_api.get_shop_info()
            connection_status = "connected"
        except Exception as e:
            connection_status = "disconnected"
            shop_info = {"error": str(e)}
        
        return jsonify({
            "success": True,
            "store": store.to_dict(),
            "connection_status": connection_status,
            "shop_info": shop_info,
            "statistics": {
                "total_products": total_products,
                "optimized_products": optimized_products,
                "optimization_rate": (optimized_products / total_products * 100) if total_products > 0 else 0
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to get store status: {str(e)}"
        }), 500

