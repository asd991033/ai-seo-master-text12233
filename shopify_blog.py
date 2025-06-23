from typing import Dict, List, Optional
from datetime import datetime
from src.services.shopify_api import ShopifyAPIService
from src.models.seo import Store
from src.models.user import db
import json
import re

class BlogArticle(db.Model):
    """部落格文章模型"""
    __tablename__ = 'blog_articles'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    shopify_blog_id = db.Column(db.String(100), nullable=False)
    shopify_article_id = db.Column(db.String(100), nullable=True)  # 如果已發布到Shopify
    title = db.Column(db.String(500), nullable=False)
    content = db.Column(db.Text, nullable=False)
    summary = db.Column(db.Text)
    tags = db.Column(db.Text)  # JSON格式存儲標籤
    language = db.Column(db.String(10), default='en')
    seo_score = db.Column(db.Float, default=0.0)
    word_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='draft')  # draft, published, synced
    published_at = db.Column(db.DateTime)
    synced_at = db.Column(db.DateTime)  # 同步到Shopify的時間
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'shopify_blog_id': self.shopify_blog_id,
            'shopify_article_id': self.shopify_article_id,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'tags': json.loads(self.tags) if self.tags else [],
            'language': self.language,
            'seo_score': self.seo_score,
            'word_count': self.word_count,
            'status': self.status,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'synced_at': self.synced_at.isoformat() if self.synced_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class ShopifyBlogSync:
    """Shopify部落格同步管理器"""
    
    def __init__(self, shopify_api: ShopifyAPIService, db_session):
        self.shopify_api = shopify_api
        self.db_session = db_session
    
    def get_available_blogs(self) -> Dict:
        """獲取Shopify商店的可用部落格"""
        try:
            blogs_response = self.shopify_api.get_blogs()
            blogs = blogs_response.get('blogs', [])
            
            return {
                'success': True,
                'blogs': blogs,
                'count': len(blogs)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_article_locally(self, store_id: int, article_data: Dict) -> Dict:
        """在本地創建部落格文章"""
        try:
            # 計算字數
            content_text = re.sub(r'<[^>]+>', '', article_data.get('content', ''))
            word_count = len(content_text.split())
            
            # 創建文章
            article = BlogArticle(
                store_id=store_id,
                shopify_blog_id=article_data.get('blog_id'),
                title=article_data.get('title'),
                content=article_data.get('content'),
                summary=article_data.get('summary', ''),
                tags=json.dumps(article_data.get('tags', [])),
                language=article_data.get('language', 'en'),
                seo_score=article_data.get('seo_score', 0),
                word_count=word_count,
                status='draft'
            )
            
            self.db_session.add(article)
            self.db_session.commit()
            
            return {
                'success': True,
                'article': article.to_dict()
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def publish_article_to_shopify(self, article_id: int) -> Dict:
        """將本地文章發布到Shopify"""
        try:
            # 獲取本地文章
            article = BlogArticle.query.get(article_id)
            if not article:
                return {'success': False, 'error': 'Article not found'}
            
            if article.shopify_article_id:
                return {'success': False, 'error': 'Article already published to Shopify'}
            
            # 準備標籤
            tags = json.loads(article.tags) if article.tags else []
            
            # 發布到Shopify
            result = self.shopify_api.create_blog_article(
                blog_id=article.shopify_blog_id,
                title=article.title,
                content=article.content,
                summary=article.summary,
                tags=tags
            )
            
            # 更新本地記錄
            shopify_article = result.get('article', {})
            article.shopify_article_id = str(shopify_article.get('id'))
            article.status = 'synced'
            article.published_at = datetime.utcnow()
            article.synced_at = datetime.utcnow()
            
            self.db_session.commit()
            
            return {
                'success': True,
                'article': article.to_dict(),
                'shopify_result': result
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_shopify_article(self, article_id: int, updates: Dict) -> Dict:
        """更新Shopify上的文章"""
        try:
            # 獲取本地文章
            article = BlogArticle.query.get(article_id)
            if not article:
                return {'success': False, 'error': 'Article not found'}
            
            if not article.shopify_article_id:
                return {'success': False, 'error': 'Article not published to Shopify yet'}
            
            # 更新本地數據
            if 'title' in updates:
                article.title = updates['title']
            if 'content' in updates:
                article.content = updates['content']
                # 重新計算字數
                content_text = re.sub(r'<[^>]+>', '', article.content)
                article.word_count = len(content_text.split())
            if 'summary' in updates:
                article.summary = updates['summary']
            
            article.updated_at = datetime.utcnow()
            
            # 更新Shopify
            result = self.shopify_api.update_blog_article(
                blog_id=article.shopify_blog_id,
                article_id=article.shopify_article_id,
                title=updates.get('title'),
                content=updates.get('content'),
                summary=updates.get('summary')
            )
            
            article.synced_at = datetime.utcnow()
            self.db_session.commit()
            
            return {
                'success': True,
                'article': article.to_dict(),
                'shopify_result': result
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def sync_articles_from_shopify(self, store_id: int, blog_id: str) -> Dict:
        """從Shopify同步文章到本地"""
        try:
            # 獲取Shopify文章
            articles_response = self.shopify_api.get_blog_articles(blog_id)
            shopify_articles = articles_response.get('articles', [])
            
            synced_count = 0
            updated_count = 0
            
            for shopify_article in shopify_articles:
                article_id = str(shopify_article['id'])
                
                # 檢查文章是否已存在
                existing_article = BlogArticle.query.filter_by(
                    store_id=store_id,
                    shopify_article_id=article_id
                ).first()
                
                if existing_article:
                    # 更新現有文章
                    existing_article.title = shopify_article.get('title', '')
                    existing_article.content = shopify_article.get('body_html', '')
                    existing_article.summary = shopify_article.get('summary', '')
                    existing_article.updated_at = datetime.utcnow()
                    updated_count += 1
                else:
                    # 創建新文章
                    content_text = re.sub(r'<[^>]+>', '', shopify_article.get('body_html', ''))
                    word_count = len(content_text.split())
                    
                    new_article = BlogArticle(
                        store_id=store_id,
                        shopify_blog_id=blog_id,
                        shopify_article_id=article_id,
                        title=shopify_article.get('title', ''),
                        content=shopify_article.get('body_html', ''),
                        summary=shopify_article.get('summary', ''),
                        tags=json.dumps(shopify_article.get('tags', '').split(',') if shopify_article.get('tags') else []),
                        word_count=word_count,
                        status='synced',
                        published_at=datetime.utcnow(),
                        synced_at=datetime.utcnow()
                    )
                    self.db_session.add(new_article)
                    synced_count += 1
            
            self.db_session.commit()
            
            return {
                'success': True,
                'synced_count': synced_count,
                'updated_count': updated_count,
                'total_articles': len(shopify_articles)
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_article_from_shopify(self, article_id: int) -> Dict:
        """從Shopify刪除文章"""
        try:
            # 獲取本地文章
            article = BlogArticle.query.get(article_id)
            if not article:
                return {'success': False, 'error': 'Article not found'}
            
            if not article.shopify_article_id:
                return {'success': False, 'error': 'Article not published to Shopify'}
            
            # 從Shopify刪除
            result = self.shopify_api.delete_blog_article(
                blog_id=article.shopify_blog_id,
                article_id=article.shopify_article_id
            )
            
            # 更新本地狀態
            article.shopify_article_id = None
            article.status = 'draft'
            article.synced_at = None
            
            self.db_session.commit()
            
            return {
                'success': True,
                'article': article.to_dict(),
                'shopify_result': result
            }
            
        except Exception as e:
            self.db_session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_articles_by_store(self, store_id: int, status: str = None) -> List[Dict]:
        """獲取商店的文章列表"""
        try:
            query = BlogArticle.query.filter_by(store_id=store_id)
            
            if status:
                query = query.filter_by(status=status)
            
            articles = query.order_by(BlogArticle.created_at.desc()).all()
            
            return {
                'success': True,
                'articles': [article.to_dict() for article in articles],
                'count': len(articles)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def batch_publish_articles(self, article_ids: List[int]) -> Dict:
        """批量發布文章到Shopify"""
        results = []
        success_count = 0
        
        for article_id in article_ids:
            result = self.publish_article_to_shopify(article_id)
            results.append({
                'article_id': article_id,
                'success': result['success'],
                'error': result.get('error') if not result['success'] else None
            })
            
            if result['success']:
                success_count += 1
        
        return {
            'success': True,
            'results': results,
            'success_count': success_count,
            'total_count': len(article_ids)
        }


class BlogContentOptimizer:
    """部落格內容優化器"""
    
    def __init__(self, ai_service):
        self.ai_service = ai_service
    
    def optimize_blog_content(self, article_data: Dict) -> Dict:
        """優化部落格內容的SEO"""
        try:
            title = article_data.get('title', '')
            content = article_data.get('content', '')
            language = article_data.get('language', 'en')
            keywords = article_data.get('keywords', [])
            
            # 使用AI服務優化內容
            optimized_result = self.ai_service.generate_blog_article(
                topic=title,
                keywords=keywords,
                language=language,
                length='medium'
            )
            
            if optimized_result:
                return {
                    'success': True,
                    'optimized_title': optimized_result.get('topic', title),
                    'optimized_content': optimized_result.get('content', content),
                    'seo_score': optimized_result.get('seo_score', 0),
                    'word_count': optimized_result.get('word_count', 0),
                    'meta_description': optimized_result.get('meta_description', ''),
                    'target_keywords': optimized_result.get('target_keywords', keywords)
                }
            else:
                return {
                    'success': False,
                    'error': 'AI optimization failed'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_blog_seo(self, article_data: Dict) -> Dict:
        """分析部落格文章的SEO"""
        try:
            title = article_data.get('title', '')
            content = article_data.get('content', '')
            language = article_data.get('language', 'en')
            
            # 使用AI服務分析SEO
            analysis_result = self.ai_service.analyze_seo_content(
                title=title,
                content=content,
                language=language
            )
            
            return {
                'success': True,
                'seo_analysis': analysis_result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

