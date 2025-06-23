import os
import hmac
import hashlib
import base64
import requests
from flask import Blueprint, request, redirect, session, jsonify, url_for
from urllib.parse import urlencode
import secrets

shopify_auth_bp = Blueprint('shopify_auth', __name__)

# Shopify應用配置
SHOPIFY_CLIENT_ID = os.getenv('SHOPIFY_CLIENT_ID', '974d76b1ff7dd9787c9bc956433e6acc')
SHOPIFY_CLIENT_SECRET = os.getenv('SHOPIFY_CLIENT_SECRET', '7b4828707ebcdf89b17750d500f4c2be')
SHOPIFY_SCOPES = os.getenv('SHOPIFY_SCOPES', 'read_products,write_products,read_content,write_content,read_themes,write_themes')
APP_URL = os.getenv('APP_URL', 'http://localhost:5006')

@shopify_auth_bp.route('/auth')
def auth():
    """開始Shopify OAuth流程"""
    shop = request.args.get('shop')
    
    if not shop:
        return jsonify({'error': 'Missing shop parameter'}), 400
    
    # 確保shop域名格式正確
    if not shop.endswith('.myshopify.com'):
        shop = f"{shop}.myshopify.com"
    
    # 生成state參數用於安全驗證
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    session['shop'] = shop
    
    # 構建OAuth授權URL
    auth_params = {
        'client_id': SHOPIFY_CLIENT_ID,
        'scope': SHOPIFY_SCOPES,
        'redirect_uri': f"{APP_URL}/auth/callback",
        'state': state
    }
    
    auth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(auth_params)}"
    
    return redirect(auth_url)

@shopify_auth_bp.route('/auth/callback')
def auth_callback():
    """處理Shopify OAuth回調"""
    code = request.args.get('code')
    state = request.args.get('state')
    shop = request.args.get('shop')
    
    # 驗證state參數
    if not state or state != session.get('oauth_state'):
        return jsonify({'error': 'Invalid state parameter'}), 400
    
    if not code or not shop:
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # 確保shop域名格式正確
    if not shop.endswith('.myshopify.com'):
        shop = f"{shop}.myshopify.com"
    
    try:
        # 交換access token
        token_data = {
            'client_id': SHOPIFY_CLIENT_ID,
            'client_secret': SHOPIFY_CLIENT_SECRET,
            'code': code
        }
        
        token_response = requests.post(
            f"https://{shop}/admin/oauth/access_token",
            json=token_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if token_response.status_code != 200:
            return jsonify({'error': 'Failed to get access token'}), 400
        
        token_info = token_response.json()
        access_token = token_info.get('access_token')
        
        if not access_token:
            return jsonify({'error': 'No access token received'}), 400
        
        # 存儲access token和shop信息
        session['access_token'] = access_token
        session['shop'] = shop
        
        # 獲取shop信息
        shop_info = get_shop_info(shop, access_token)
        if shop_info:
            session['shop_info'] = shop_info
        
        # 清理OAuth狀態
        session.pop('oauth_state', None)
        
        # 重定向到應用主頁
        return redirect('/')
        
    except Exception as e:
        return jsonify({'error': f'OAuth callback error: {str(e)}'}), 500

@shopify_auth_bp.route('/auth/verify')
def verify_auth():
    """驗證當前認證狀態"""
    access_token = session.get('access_token')
    shop = session.get('shop')
    
    if not access_token or not shop:
        return jsonify({'authenticated': False}), 200
    
    # 驗證token是否仍然有效
    try:
        response = requests.get(
            f"https://{shop}/admin/api/2023-10/shop.json",
            headers={'X-Shopify-Access-Token': access_token}
        )
        
        if response.status_code == 200:
            return jsonify({
                'authenticated': True,
                'shop': shop,
                'shop_info': session.get('shop_info', {})
            }), 200
        else:
            # Token無效，清理session
            session.clear()
            return jsonify({'authenticated': False}), 200
            
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 200

@shopify_auth_bp.route('/webhooks/app/uninstalled', methods=['POST'])
def app_uninstalled():
    """處理應用卸載webhook"""
    # 驗證webhook
    if not verify_webhook(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # 獲取shop域名
        shop_domain = request.headers.get('X-Shopify-Shop-Domain')
        
        if shop_domain:
            # 清理該shop的所有數據
            cleanup_shop_data(shop_domain)
            
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def verify_webhook(request):
    """驗證Shopify webhook"""
    webhook_secret = os.getenv('SHOPIFY_WEBHOOK_SECRET', SHOPIFY_CLIENT_SECRET)
    
    # 獲取Shopify簽名
    signature = request.headers.get('X-Shopify-Hmac-Sha256')
    if not signature:
        return False
    
    # 計算預期簽名
    body = request.get_data()
    expected_signature = base64.b64encode(
        hmac.new(
            webhook_secret.encode('utf-8'),
            body,
            hashlib.sha256
        ).digest()
    ).decode('utf-8')
    
    # 比較簽名
    return hmac.compare_digest(signature, expected_signature)

def get_shop_info(shop, access_token):
    """獲取shop基本信息"""
    try:
        response = requests.get(
            f"https://{shop}/admin/api/2023-10/shop.json",
            headers={'X-Shopify-Access-Token': access_token}
        )
        
        if response.status_code == 200:
            shop_data = response.json().get('shop', {})
            return {
                'id': shop_data.get('id'),
                'name': shop_data.get('name'),
                'domain': shop_data.get('domain'),
                'myshopify_domain': shop_data.get('myshopify_domain'),
                'email': shop_data.get('email'),
                'currency': shop_data.get('currency'),
                'timezone': shop_data.get('iana_timezone'),
                'plan_name': shop_data.get('plan_name')
            }
    except Exception as e:
        print(f"Error getting shop info: {e}")
    
    return None

def cleanup_shop_data(shop_domain):
    """清理shop相關數據"""
    try:
        # 這裡應該清理數據庫中該shop的所有數據
        # 包括products, seo_tasks, keywords等
        print(f"Cleaning up data for shop: {shop_domain}")
        
        # TODO: 實現數據清理邏輯
        # 例如：
        # Store.query.filter_by(shop_domain=shop_domain).delete()
        # db.session.commit()
        
    except Exception as e:
        print(f"Error cleaning up shop data: {e}")

@shopify_auth_bp.route('/auth/logout')
def logout():
    """登出並清理session"""
    session.clear()
    return jsonify({'status': 'logged out'}), 200

