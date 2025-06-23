from src.models.user import db
from datetime import datetime
import json

class Store(db.Model):
    __tablename__ = 'stores'
    
    id = db.Column(db.Integer, primary_key=True)
    shop_domain = db.Column(db.String(255), unique=True, nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    plan_type = db.Column(db.String(50), default='free')
    settings = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯關係
    seo_tasks = db.relationship('SeoTask', backref='store', lazy=True)
    keywords = db.relationship('Keyword', backref='store', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'shop_domain': self.shop_domain,
            'plan_type': self.plan_type,
            'settings': json.loads(self.settings) if self.settings else {},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class SeoTask(db.Model):
    __tablename__ = 'seo_tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=True)  # 允許為空用於測試
    task_type = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='pending')
    language = db.Column(db.String(10), default='en')  # 添加語言字段
    input_data = db.Column(db.Text)
    output_data = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'task_type': self.task_type,
            'status': self.status,
            'language': self.language,
            'input_data': json.loads(self.input_data) if self.input_data else {},
            'output_data': json.loads(self.output_data) if self.output_data else {},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class Keyword(db.Model):
    __tablename__ = 'keywords'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    keyword = db.Column(db.String(255), nullable=False)
    search_volume = db.Column(db.Integer)
    difficulty_score = db.Column(db.Integer)
    current_rank = db.Column(db.Integer)
    target_rank = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'keyword': self.keyword,
            'search_volume': self.search_volume,
            'difficulty_score': self.difficulty_score,
            'current_rank': self.current_rank,
            'target_rank': self.target_rank,
            'created_at': self.created_at.isoformat()
        }

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    shopify_product_id = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(500))
    description = db.Column(db.Text)
    seo_title = db.Column(db.String(500))
    seo_description = db.Column(db.Text)
    keywords = db.Column(db.Text)  # JSON格式存儲關鍵詞
    seo_score = db.Column(db.Float, default=0.0)
    last_optimized = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'store_id': self.store_id,
            'shopify_product_id': self.shopify_product_id,
            'title': self.title,
            'description': self.description,
            'seo_title': self.seo_title,
            'seo_description': self.seo_description,
            'keywords': json.loads(self.keywords) if self.keywords else [],
            'seo_score': self.seo_score,
            'last_optimized': self.last_optimized.isoformat() if self.last_optimized else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

