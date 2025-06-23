#!/usr/bin/env python3
"""
數據庫初始化腳本
創建默認數據和測試數據
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.main import app, db
from src.models.seo import Store, Product, SeoTask, Keyword
from datetime import datetime

def init_database():
    """初始化數據庫並創建測試數據"""
    
    with app.app_context():
        # 創建所有表
        db.create_all()
        print("✅ 數據庫表創建完成")
        
        # 檢查是否已有數據
        if Store.query.first():
            print("⚠️ 數據庫已有數據，跳過初始化")
            return
        
        # 創建默認商店
        default_store = Store(
            shop_domain="demo-store.myshopify.com",
            access_token="demo_access_token",
            plan_type="professional",
            settings='{"language": "en", "timezone": "UTC"}',
            created_at=datetime.utcnow()
        )
        db.session.add(default_store)
        db.session.commit()
        print("✅ 默認商店創建完成")
        
        # 創建測試產品
        products = [
            {
                "title": "Premium Wireless Bluetooth Headphones",
                "description": "High-quality wireless Bluetooth headphones with crystal clear sound and comfortable fit.",
                "shopify_product_id": "prod_001",
                "seo_score": 85.5,
                "seo_title": "AI Optimized: Premium Wireless Bluetooth Headphones | Crystal Clear Sound | Comfortable Fit",
                "seo_description": "Professional AI-optimized product description with relevant keywords. High-quality wireless Bluetooth headphones with crystal clear sound and comfortable fit. Premium quality, trusted brand.",
                "keywords": '["wireless headphones", "bluetooth", "premium audio"]',
                "last_optimized": datetime.utcnow()
            },
            {
                "title": "Smart Watch Sports Edition",
                "description": "Multi-functional smart watch with sports monitoring and health tracking features.",
                "shopify_product_id": "prod_002",
                "seo_score": 60.2,
                "seo_title": "",
                "seo_description": "",
                "keywords": '["smart watch", "fitness", "sports"]',
                "last_optimized": datetime.utcnow()
            },
            {
                "title": "Portable Power Bank",
                "description": "High-capacity portable power bank with fast charging and reliable safety features.",
                "shopify_product_id": "prod_003",
                "seo_score": 78.3,
                "seo_title": "AI Optimized: Portable Power Bank | High Capacity Fast Charging | Safe & Reliable",
                "seo_description": "Professional AI-optimized product description with relevant keywords. High-capacity portable power bank with fast charging and reliable safety features. Premium quality, trusted brand.",
                "keywords": '["power bank", "fast charging", "portable"]',
                "last_optimized": datetime.utcnow()
            },
            {
                "title": "Reloj Inteligente Deportivo",
                "description": "Reloj inteligente multifuncional con monitoreo deportivo y seguimiento de salud.",
                "shopify_product_id": "prod_004",
                "seo_score": 42.1,
                "seo_title": "",
                "seo_description": "",
                "keywords": '["reloj inteligente", "deportivo", "salud"]'
            },
            {
                "title": "Écouteurs Bluetooth Sans Fil",
                "description": "Écouteurs Bluetooth sans fil de haute qualité avec son cristallin et ajustement confortable.",
                "shopify_product_id": "prod_005",
                "seo_score": 38.7,
                "seo_title": "",
                "seo_description": "",
                "keywords": '["écouteurs bluetooth", "sans fil", "qualité"]'
            }
        ]
        
        for product_data in products:
            product = Product(
                store_id=default_store.id,
                **product_data,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(product)
        
        db.session.commit()
        print("✅ 測試產品創建完成")
        
        # 創建測試關鍵詞
        keywords = [
            {"keyword": "wireless headphones", "search_volume": 12000, "difficulty_score": 65},
            {"keyword": "bluetooth headphones", "search_volume": 8500, "difficulty_score": 58},
            {"keyword": "smart watch", "search_volume": 15000, "difficulty_score": 72},
            {"keyword": "fitness tracker", "search_volume": 9800, "difficulty_score": 61},
            {"keyword": "power bank", "search_volume": 7200, "difficulty_score": 45},
            {"keyword": "reloj inteligente", "search_volume": 3400, "difficulty_score": 52},
            {"keyword": "écouteurs bluetooth", "search_volume": 2100, "difficulty_score": 48}
        ]
        
        for keyword_data in keywords:
            keyword = Keyword(
                store_id=default_store.id,
                **keyword_data,
                created_at=datetime.utcnow()
            )
            db.session.add(keyword)
        
        db.session.commit()
        print("✅ 測試關鍵詞創建完成")
        
        # 創建測試SEO任務
        seo_tasks = [
            {
                "task_type": "title_optimization",
                "status": "completed",
                "language": "en",
                "input_data": '{"product_title": "Premium Wireless Bluetooth Headphones"}',
                "output_data": '{"optimized_title": "AI Optimized: Premium Wireless Bluetooth Headphones | Crystal Clear Sound | Comfortable Fit", "seo_score": 85.5}',
                "completed_at": datetime.utcnow()
            },
            {
                "task_type": "description_optimization", 
                "status": "completed",
                "language": "en",
                "input_data": '{"product_description": "Multi-functional smart watch with sports monitoring and health tracking features."}',
                "output_data": '{"optimized_description": "Professional smart watch description", "seo_score": 60.2}',
                "completed_at": datetime.utcnow()
            }
        ]
        
        for task_data in seo_tasks:
            task = SeoTask(
                store_id=default_store.id,
                **task_data,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(task)
        
        db.session.commit()
        print("✅ 測試SEO任務創建完成")
        
        print("\n🎉 數據庫初始化完成！")
        print(f"📊 創建數據統計:")
        print(f"   - 商店: {Store.query.count()}")
        print(f"   - 產品: {Product.query.count()}")
        print(f"   - 關鍵詞: {Keyword.query.count()}")
        print(f"   - SEO任務: {SeoTask.query.count()}")

if __name__ == "__main__":
    init_database()

