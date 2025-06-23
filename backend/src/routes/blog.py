from flask import Blueprint, request, jsonify
from src.services.shopify_api import ShopifyAPIService
from src.services.shopify_blog import ShopifyBlogSync, BlogArticle, BlogContentOptimizer
from src.services.deepseek_ai import DeepSeekAIService
from src.models.seo import Store
from src.models.user import db
import json
from datetime import datetime

blog_bp = Blueprint('blog', __name__)

@blog_bp.route('/blogs', methods=['GET'])
def get_available_blogs():
    """獲取Shopify商店的可用部落格"""
    try:
        store_id = request.args.get('store_id')
        
        if not store_id:
            return jsonify({"error": "Store ID is required"}), 400
        
        # 獲取商店信息
        store = Store.query.get(store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化Shopify API
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        blog_sync = ShopifyBlogSync(shopify_api, db.session)
        
        # 獲取可用部落格
        result = blog_sync.get_available_blogs()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to get blogs: {str(e)}"
        }), 500

@blog_bp.route('/articles', methods=['GET'])
def get_articles():
    """獲取部落格文章列表"""
    try:
        store_id = request.args.get('store_id')
        status = request.args.get('status')  # draft, published, synced
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        if not store_id:
            return jsonify({"error": "Store ID is required"}), 400
        
        # 查詢文章
        query = BlogArticle.query.filter_by(store_id=store_id)
        
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        articles = query.order_by(BlogArticle.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
        
        return jsonify({
            "success": True,
            "articles": [article.to_dict() for article in articles],
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
            "error": f"Failed to get articles: {str(e)}"
        }), 500

@blog_bp.route('/articles', methods=['POST'])
def create_article():
    """創建新的部落格文章"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        store_id = data.get('store_id')
        if not store_id:
            return jsonify({"error": "Store ID is required"}), 400
        
        # 獲取商店信息
        store = Store.query.get(store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化服務
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        blog_sync = ShopifyBlogSync(shopify_api, db.session)
        
        # 創建文章
        result = blog_sync.create_article_locally(store_id, data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to create article: {str(e)}"
        }), 500

@blog_bp.route('/articles/<int:article_id>', methods=['PUT'])
def update_article():
    """更新部落格文章"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # 獲取文章
        article = BlogArticle.query.get(article_id)
        if not article:
            return jsonify({"error": "Article not found"}), 404
        
        # 獲取商店信息
        store = Store.query.get(article.store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 更新本地文章
        if 'title' in data:
            article.title = data['title']
        if 'content' in data:
            article.content = data['content']
            # 重新計算字數
            import re
            content_text = re.sub(r'<[^>]+>', '', article.content)
            article.word_count = len(content_text.split())
        if 'summary' in data:
            article.summary = data['summary']
        if 'tags' in data:
            article.tags = json.dumps(data['tags'])
        if 'seo_score' in data:
            article.seo_score = data['seo_score']
        
        article.updated_at = datetime.utcnow()
        
        # 如果文章已同步到Shopify，也更新Shopify
        if article.shopify_article_id and data.get('sync_to_shopify', False):
            shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
            blog_sync = ShopifyBlogSync(shopify_api, db.session)
            
            sync_result = blog_sync.update_shopify_article(article_id, data)
            if not sync_result['success']:
                return jsonify(sync_result), 500
        else:
            db.session.commit()
        
        return jsonify({
            "success": True,
            "article": article.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": f"Failed to update article: {str(e)}"
        }), 500

@blog_bp.route('/articles/<int:article_id>/publish', methods=['POST'])
def publish_article():
    """發布文章到Shopify"""
    try:
        # 獲取文章
        article = BlogArticle.query.get(article_id)
        if not article:
            return jsonify({"error": "Article not found"}), 404
        
        # 獲取商店信息
        store = Store.query.get(article.store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化服務
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        blog_sync = ShopifyBlogSync(shopify_api, db.session)
        
        # 發布到Shopify
        result = blog_sync.publish_article_to_shopify(article_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to publish article: {str(e)}"
        }), 500

@blog_bp.route('/articles/<int:article_id>/unpublish', methods=['POST'])
def unpublish_article():
    """從Shopify取消發布文章"""
    try:
        # 獲取文章
        article = BlogArticle.query.get(article_id)
        if not article:
            return jsonify({"error": "Article not found"}), 404
        
        # 獲取商店信息
        store = Store.query.get(article.store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化服務
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        blog_sync = ShopifyBlogSync(shopify_api, db.session)
        
        # 從Shopify刪除
        result = blog_sync.delete_article_from_shopify(article_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to unpublish article: {str(e)}"
        }), 500

@blog_bp.route('/articles/<int:article_id>/optimize', methods=['POST'])
def optimize_article():
    """優化文章SEO"""
    try:
        data = request.get_json()
        
        # 獲取文章
        article = BlogArticle.query.get(article_id)
        if not article:
            return jsonify({"error": "Article not found"}), 404
        
        # 初始化AI服務
        ai_service = DeepSeekAIService()
        optimizer = BlogContentOptimizer(ai_service)
        
        # 準備優化數據
        article_data = {
            'title': article.title,
            'content': article.content,
            'language': article.language,
            'keywords': data.get('keywords', [])
        }
        
        # 執行優化
        result = optimizer.optimize_blog_content(article_data)
        
        if result['success']:
            # 更新文章
            article.title = result['optimized_title']
            article.content = result['optimized_content']
            article.seo_score = result['seo_score']
            article.word_count = result['word_count']
            article.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                "success": True,
                "article": article.to_dict(),
                "optimization_result": result
            })
        else:
            return jsonify(result), 500
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to optimize article: {str(e)}"
        }), 500

@blog_bp.route('/sync-from-shopify', methods=['POST'])
def sync_from_shopify():
    """從Shopify同步文章到本地"""
    try:
        data = request.get_json()
        
        store_id = data.get('store_id')
        blog_id = data.get('blog_id')
        
        if not store_id or not blog_id:
            return jsonify({"error": "Store ID and Blog ID are required"}), 400
        
        # 獲取商店信息
        store = Store.query.get(store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化服務
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        blog_sync = ShopifyBlogSync(shopify_api, db.session)
        
        # 執行同步
        result = blog_sync.sync_articles_from_shopify(store_id, blog_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Sync failed: {str(e)}"
        }), 500

@blog_bp.route('/articles/batch-publish', methods=['POST'])
def batch_publish_articles():
    """批量發布文章到Shopify"""
    try:
        data = request.get_json()
        
        article_ids = data.get('article_ids', [])
        if not article_ids:
            return jsonify({"error": "Article IDs are required"}), 400
        
        # 獲取第一篇文章來確定商店
        first_article = BlogArticle.query.get(article_ids[0])
        if not first_article:
            return jsonify({"error": "First article not found"}), 404
        
        # 獲取商店信息
        store = Store.query.get(first_article.store_id)
        if not store:
            return jsonify({"error": "Store not found"}), 404
        
        # 初始化服務
        shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        blog_sync = ShopifyBlogSync(shopify_api, db.session)
        
        # 批量發布
        result = blog_sync.batch_publish_articles(article_ids)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Batch publish failed: {str(e)}"
        }), 500

@blog_bp.route('/articles/<int:article_id>/analyze', methods=['POST'])
def analyze_article_seo():
    """分析文章SEO"""
    try:
        # 獲取文章
        article = BlogArticle.query.get(article_id)
        if not article:
            return jsonify({"error": "Article not found"}), 404
        
        # 初始化AI服務
        ai_service = DeepSeekAIService()
        optimizer = BlogContentOptimizer(ai_service)
        
        # 準備分析數據
        article_data = {
            'title': article.title,
            'content': article.content,
            'language': article.language
        }
        
        # 執行分析
        result = optimizer.analyze_blog_seo(article_data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to analyze article: {str(e)}"
        }), 500

@blog_bp.route('/generate-from-ai', methods=['POST'])
def generate_article_from_ai():
    """使用AI生成部落格文章並保存到本地（包含圖片生成）"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        store_id = data.get('store_id')
        blog_id = data.get('blog_id', 'main-blog')  # 默認blog_id
        topic = data.get('topic')
        keywords = data.get('keywords', [])
        language = data.get('language', 'en')
        length = data.get('length', 'medium')
        include_images = data.get('include_images', True)  # 新增圖片生成選項
        
        if not topic:
            return jsonify({"error": "Topic is required"}), 400
        
        # 如果沒有提供store_id，使用默認store
        if not store_id:
            store = Store.query.first()  # 獲取第一個store作為默認
            if not store:
                return jsonify({"error": "No store found. Please initialize database first."}), 404
            store_id = store.id
        else:
            # 獲取指定的商店信息
            store = Store.query.get(store_id)
            if not store:
                return jsonify({"error": "Store not found"}), 404
        
        # 初始化增強的部落格生成器
        from src.services.blog_image_generator import EnhancedBlogGenerator
        
        # 使用默認API key或模擬模式
        try:
            ai_service = DeepSeekAIService("demo_api_key")
        except Exception:
            # 如果DeepSeek服務不可用，使用模擬響應
            class MockAIService:
                def generate_blog_article(self, data):
                    return {
                        "title": f"Complete Guide: {data['topic']}",
                        "content": f"This is a comprehensive guide about {data['topic']}. " * 50,
                        "summary": f"A detailed overview of {data['topic']} covering all essential aspects.",
                        "seo_score": 92.5,
                        "word_count": 500,
                        "reading_time": 3
                    }
            ai_service = MockAIService()
        
        # 如果需要圖片，初始化Shopify API
        shopify_api = None
        if include_images:
            from src.services.shopify_api import ShopifyAPIService
            shopify_api = ShopifyAPIService(store.shop_domain, store.access_token)
        
        enhanced_generator = EnhancedBlogGenerator(ai_service, shopify_api)
        
        # 生成完整文章（包含圖片）
        generation_result = enhanced_generator.generate_complete_blog_article({
            'topic': topic,
            'keywords': keywords,
            'language': language,
            'length': length,
            'include_images': include_images
        })
        
        if not generation_result['success']:
            return jsonify(generation_result), 500
        
        article_result = generation_result['article']
        
        # 初始化部落格同步服務
        shopify_api_sync = ShopifyAPIService(store.shop_domain, store.access_token)
        blog_sync = ShopifyBlogSync(shopify_api_sync, db.session)
        
        # 準備文章數據
        article_data = {
            'blog_id': blog_id,
            'title': article_result.get('topic', topic),
            'content': article_result.get('content', ''),
            'summary': article_result.get('meta_description', ''),
            'tags': article_result.get('target_keywords', keywords),
            'language': language,
            'seo_score': article_result.get('seo_score', 0)
        }
        
        # 創建本地文章
        create_result = blog_sync.create_article_locally(store_id, article_data)
        
        if create_result['success']:
            response_data = {
                "success": True,
                "article": create_result['article'],
                "generation_result": article_result
            }
            
            # 如果包含圖片，添加圖片信息
            if include_images and 'images' in article_result:
                response_data['images'] = article_result['images']
                response_data['image_count'] = article_result.get('image_count', 0)
            
            # 如果有警告信息，添加到響應中
            if 'warning' in generation_result:
                response_data['warning'] = generation_result['warning']
            
            return jsonify(response_data)
        else:
            return jsonify(create_result), 500
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to generate article: {str(e)}"
        }), 500

