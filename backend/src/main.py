import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.seo import Store, SeoTask, Keyword, Product
from src.services.shopify_blog import BlogArticle
from src.routes.user import user_bp
from src.routes.seo import seo_bp
from src.routes.shopify import shopify_bp
from src.routes.blog import blog_bp
from src.routes.shopify_auth import shopify_auth_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'ai-seo-master-secret-key-2024'

# 啟用CORS以支持前端跨域請求
CORS(app, origins="*")

# 註冊藍圖
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(seo_bp, url_prefix='/api/seo')
app.register_blueprint(shopify_bp, url_prefix='/api/shopify')
app.register_blueprint(blog_bp, url_prefix='/api/blog')
app.register_blueprint(shopify_auth_bp)

# 數據庫配置
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# 創建數據庫表
with app.app_context():
    db.create_all()

@app.route('/privacy')
def privacy_policy():
    return send_from_directory(app.static_folder, 'privacy.html')

@app.route('/terms')
def terms_of_service():
    return send_from_directory(app.static_folder, 'terms.html')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # 如果是API請求，不處理
    if path.startswith('api/'):
        return "API endpoint not found", 404
        
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5006, debug=True)
