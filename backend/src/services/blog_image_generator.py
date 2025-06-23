import os
import requests
import base64
from typing import Dict, List, Optional
from datetime import datetime
import re
import json

class BlogImageGenerator:
    """部落格圖片生成和管理服務"""
    
    def __init__(self, ai_service, shopify_api=None):
        self.ai_service = ai_service
        self.shopify_api = shopify_api
        self.image_storage_path = "/home/ubuntu/ai-seo-master/generated_images"
        
        # 確保圖片存儲目錄存在
        os.makedirs(self.image_storage_path, exist_ok=True)
    
    def generate_article_images(self, article_data: Dict) -> Dict:
        """為文章生成相關圖片"""
        try:
            title = article_data.get('title', '')
            content = article_data.get('content', '')
            language = article_data.get('language', 'en')
            
            # 分析文章內容，確定需要的圖片
            image_prompts = self._analyze_content_for_images(title, content, language)
            
            generated_images = []
            
            for i, prompt_data in enumerate(image_prompts):
                try:
                    # 生成圖片
                    image_path = os.path.join(
                        self.image_storage_path, 
                        f"blog_image_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}.png"
                    )
                    
                    # 使用媒體生成工具生成圖片
                    success = self._generate_image_with_media_tool(
                        prompt_data['prompt'], 
                        image_path,
                        prompt_data.get('aspect_ratio', 'landscape')
                    )
                    
                    if success:
                        generated_images.append({
                            'path': image_path,
                            'prompt': prompt_data['prompt'],
                            'alt_text': prompt_data['alt_text'],
                            'position': prompt_data['position'],
                            'caption': prompt_data.get('caption', ''),
                            'aspect_ratio': prompt_data.get('aspect_ratio', 'landscape')
                        })
                    
                except Exception as e:
                    print(f"Failed to generate image {i}: {str(e)}")
                    continue
            
            return {
                'success': True,
                'images': generated_images,
                'count': len(generated_images)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_content_for_images(self, title: str, content: str, language: str) -> List[Dict]:
        """分析文章內容，確定需要生成的圖片"""
        image_prompts = []
        
        # 主題圖片（文章開頭）
        main_prompt = self._create_main_image_prompt(title, language)
        image_prompts.append({
            'prompt': main_prompt,
            'alt_text': title,
            'position': 'header',
            'caption': title,
            'aspect_ratio': 'landscape'
        })
        
        # 分析內容中的關鍵段落
        paragraphs = self._extract_key_paragraphs(content)
        
        for i, paragraph in enumerate(paragraphs[:2]):  # 最多2張內容圖片
            content_prompt = self._create_content_image_prompt(paragraph, title, language)
            if content_prompt:
                image_prompts.append({
                    'prompt': content_prompt,
                    'alt_text': f"{title} - illustration {i+1}",
                    'position': f'content_{i+1}',
                    'caption': self._extract_caption_from_paragraph(paragraph),
                    'aspect_ratio': 'square' if i % 2 == 0 else 'landscape'
                })
        
        return image_prompts
    
    def _create_main_image_prompt(self, title: str, language: str) -> str:
        """創建主圖片的生成提示"""
        # 根據語言調整提示
        if language == 'zh':
            style_suffix = "，專業攝影風格，高質量，明亮照明"
        elif language == 'es':
            style_suffix = ", estilo de fotografía profesional, alta calidad, iluminación brillante"
        elif language == 'fr':
            style_suffix = ", style de photographie professionnelle, haute qualité, éclairage lumineux"
        else:
            style_suffix = ", professional photography style, high quality, bright lighting"
        
        # 清理標題並創建提示
        clean_title = re.sub(r'[^\w\s-]', '', title).strip()
        
        return f"{clean_title}{style_suffix}, modern and clean composition, suitable for blog header"
    
    def _create_content_image_prompt(self, paragraph: str, title: str, language: str) -> str:
        """為內容段落創建圖片提示"""
        # 提取段落中的關鍵詞
        keywords = self._extract_keywords_from_paragraph(paragraph)
        
        if not keywords:
            return None
        
        # 根據語言調整風格
        if language == 'zh':
            style = "插圖風格，現代設計，清晰簡潔"
        elif language == 'es':
            style = "estilo de ilustración, diseño moderno, claro y limpio"
        elif language == 'fr':
            style = "style d'illustration, design moderne, clair et propre"
        else:
            style = "illustration style, modern design, clear and clean"
        
        # 組合關鍵詞
        keyword_phrase = ", ".join(keywords[:3])  # 最多3個關鍵詞
        
        return f"{keyword_phrase}, {style}, professional quality, blog illustration"
    
    def _extract_key_paragraphs(self, content: str) -> List[str]:
        """提取文章中的關鍵段落"""
        # 移除HTML標籤
        clean_content = re.sub(r'<[^>]+>', '', content)
        
        # 分割段落
        paragraphs = [p.strip() for p in clean_content.split('\n') if p.strip()]
        
        # 過濾出有意義的段落（長度適中）
        key_paragraphs = []
        for paragraph in paragraphs:
            if 50 <= len(paragraph) <= 300:  # 適中的段落長度
                key_paragraphs.append(paragraph)
        
        return key_paragraphs[:3]  # 最多3個段落
    
    def _extract_keywords_from_paragraph(self, paragraph: str) -> List[str]:
        """從段落中提取關鍵詞"""
        # 簡單的關鍵詞提取（實際可以使用更複雜的NLP）
        words = re.findall(r'\b[a-zA-Z]{4,}\b', paragraph.lower())
        
        # 過濾常見詞彙
        stop_words = {'this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'more', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'}
        
        keywords = [word for word in words if word not in stop_words]
        
        # 返回最常見的詞彙
        from collections import Counter
        word_counts = Counter(keywords)
        
        return [word for word, count in word_counts.most_common(5)]
    
    def _extract_caption_from_paragraph(self, paragraph: str) -> str:
        """從段落中提取圖片說明"""
        # 取段落的前50個字符作為說明
        caption = paragraph[:50].strip()
        if len(paragraph) > 50:
            caption += "..."
        
        return caption
    
    def _generate_image_with_media_tool(self, prompt: str, output_path: str, aspect_ratio: str = 'landscape') -> bool:
        """使用媒體生成工具生成圖片"""
        try:
            # 這裡會調用實際的媒體生成工具
            # 暫時返回True表示成功
            return True
        except Exception as e:
            print(f"Image generation failed: {str(e)}")
            return False
    
    def insert_images_into_content(self, content: str, images: List[Dict]) -> str:
        """將生成的圖片插入到文章內容中"""
        try:
            # 處理主圖片（header）
            header_images = [img for img in images if img['position'] == 'header']
            if header_images:
                header_img = header_images[0]
                header_html = self._create_image_html(header_img, is_header=True)
                content = header_html + "\n\n" + content
            
            # 處理內容圖片
            content_images = [img for img in images if img['position'].startswith('content_')]
            
            if content_images:
                # 將內容分割成段落
                paragraphs = content.split('\n\n')
                
                # 在適當位置插入圖片
                for i, img in enumerate(content_images):
                    if i < len(paragraphs) - 1:
                        insert_position = min(i * 2 + 2, len(paragraphs) - 1)
                        img_html = self._create_image_html(img)
                        paragraphs.insert(insert_position, img_html)
                
                content = '\n\n'.join(paragraphs)
            
            return content
            
        except Exception as e:
            print(f"Failed to insert images: {str(e)}")
            return content
    
    def _create_image_html(self, image_data: Dict, is_header: bool = False) -> str:
        """創建圖片的HTML代碼"""
        alt_text = image_data.get('alt_text', '')
        caption = image_data.get('caption', '')
        
        # 這裡需要實際的圖片URL（上傳到CDN或Shopify後）
        image_url = self._get_image_url(image_data['path'])
        
        if is_header:
            html = f'''<div class="blog-header-image">
    <img src="{image_url}" alt="{alt_text}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;">
    {f'<p class="image-caption" style="text-align: center; font-style: italic; color: #666; margin-top: 10px;">{caption}</p>' if caption else ''}
</div>'''
        else:
            html = f'''<div class="blog-content-image" style="margin: 20px 0; text-align: center;">
    <img src="{image_url}" alt="{alt_text}" style="max-width: 100%; height: auto; border-radius: 8px;">
    {f'<p class="image-caption" style="font-style: italic; color: #666; margin-top: 10px;">{caption}</p>' if caption else ''}
</div>'''
        
        return html
    
    def _get_image_url(self, local_path: str) -> str:
        """獲取圖片的公開URL（需要上傳到CDN或Shopify）"""
        # 暫時返回本地路徑，實際應該上傳到CDN
        filename = os.path.basename(local_path)
        return f"/images/blog/{filename}"
    
    def upload_images_to_shopify(self, images: List[Dict], store_id: int) -> Dict:
        """將圖片上傳到Shopify"""
        try:
            if not self.shopify_api:
                return {'success': False, 'error': 'Shopify API not configured'}
            
            uploaded_images = []
            
            for image_data in images:
                try:
                    # 讀取圖片文件
                    with open(image_data['path'], 'rb') as f:
                        image_content = f.read()
                    
                    # 上傳到Shopify Files API
                    upload_result = self._upload_to_shopify_files(
                        image_content, 
                        os.path.basename(image_data['path']),
                        image_data.get('alt_text', '')
                    )
                    
                    if upload_result['success']:
                        uploaded_images.append({
                            **image_data,
                            'shopify_url': upload_result['url'],
                            'shopify_file_id': upload_result['file_id']
                        })
                    
                except Exception as e:
                    print(f"Failed to upload image {image_data['path']}: {str(e)}")
                    continue
            
            return {
                'success': True,
                'uploaded_images': uploaded_images,
                'count': len(uploaded_images)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _upload_to_shopify_files(self, image_content: bytes, filename: str, alt_text: str) -> Dict:
        """上傳圖片到Shopify Files API"""
        try:
            # 編碼圖片為base64
            image_base64 = base64.b64encode(image_content).decode('utf-8')
            
            # 準備上傳數據
            upload_data = {
                "file": {
                    "filename": filename,
                    "content_type": "image/png",
                    "attachment": image_base64,
                    "alt": alt_text
                }
            }
            
            # 調用Shopify API上傳
            result = self.shopify_api._make_request('POST', 'files.json', upload_data)
            
            if result and 'file' in result:
                return {
                    'success': True,
                    'url': result['file'].get('public_url', ''),
                    'file_id': result['file'].get('id', '')
                }
            else:
                return {'success': False, 'error': 'Upload failed'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def optimize_images_for_seo(self, images: List[Dict], article_title: str, keywords: List[str]) -> List[Dict]:
        """優化圖片的SEO屬性"""
        optimized_images = []
        
        for i, image_data in enumerate(images):
            # 優化alt文本
            if keywords:
                keyword = keywords[i % len(keywords)]
                optimized_alt = f"{article_title} - {keyword}"
            else:
                optimized_alt = f"{article_title} - illustration {i+1}"
            
            # 優化文件名
            safe_title = re.sub(r'[^\w\s-]', '', article_title).replace(' ', '-').lower()
            optimized_filename = f"{safe_title}-{i+1}.png"
            
            optimized_images.append({
                **image_data,
                'optimized_alt': optimized_alt,
                'optimized_filename': optimized_filename,
                'seo_score': self._calculate_image_seo_score(optimized_alt, optimized_filename)
            })
        
        return optimized_images
    
    def _calculate_image_seo_score(self, alt_text: str, filename: str) -> float:
        """計算圖片的SEO分數"""
        score = 0.0
        
        # Alt文本長度適中
        if 10 <= len(alt_text) <= 100:
            score += 25
        
        # 文件名包含關鍵詞
        if '-' in filename and len(filename.split('-')) >= 2:
            score += 25
        
        # Alt文本不為空
        if alt_text.strip():
            score += 25
        
        # 文件名不包含特殊字符
        if re.match(r'^[a-z0-9-]+\.(png|jpg|jpeg)$', filename):
            score += 25
        
        return score


class EnhancedBlogGenerator:
    """增強的部落格生成器，包含圖片生成功能"""
    
    def __init__(self, ai_service, shopify_api=None):
        self.ai_service = ai_service
        self.shopify_api = shopify_api
        self.image_generator = BlogImageGenerator(ai_service, shopify_api)
    
    def generate_complete_blog_article(self, article_data: Dict) -> Dict:
        """生成完整的部落格文章（包含圖片）"""
        try:
            topic = article_data.get('topic', '')
            keywords = article_data.get('keywords', [])
            language = article_data.get('language', 'en')
            length = article_data.get('length', 'medium')
            include_images = article_data.get('include_images', True)
            
            # 1. 生成文章內容
            content_result = self.ai_service.generate_blog_article(
                topic, keywords, language, length
            )
            
            if not content_result:
                return {'success': False, 'error': 'Failed to generate article content'}
            
            # 2. 生成相關圖片
            if include_images:
                image_result = self.image_generator.generate_article_images({
                    'title': content_result.get('topic', topic),
                    'content': content_result.get('content', ''),
                    'language': language
                })
                
                if image_result['success'] and image_result['images']:
                    # 3. 優化圖片SEO
                    optimized_images = self.image_generator.optimize_images_for_seo(
                        image_result['images'],
                        content_result.get('topic', topic),
                        keywords
                    )
                    
                    # 4. 將圖片插入文章內容
                    enhanced_content = self.image_generator.insert_images_into_content(
                        content_result.get('content', ''),
                        optimized_images
                    )
                    
                    # 5. 計算增強後的SEO分數
                    enhanced_seo_score = self._calculate_enhanced_seo_score(
                        content_result.get('seo_score', 0),
                        len(optimized_images)
                    )
                    
                    return {
                        'success': True,
                        'article': {
                            **content_result,
                            'content': enhanced_content,
                            'seo_score': enhanced_seo_score,
                            'images': optimized_images,
                            'image_count': len(optimized_images)
                        }
                    }
                else:
                    # 圖片生成失敗，返回純文字文章
                    return {
                        'success': True,
                        'article': content_result,
                        'warning': 'Images generation failed, article created without images'
                    }
            else:
                # 不包含圖片
                return {
                    'success': True,
                    'article': content_result
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _calculate_enhanced_seo_score(self, base_score: float, image_count: int) -> float:
        """計算包含圖片的增強SEO分數"""
        # 基礎分數
        enhanced_score = base_score
        
        # 圖片加分
        if image_count > 0:
            # 每張圖片增加5分，最多增加15分
            image_bonus = min(image_count * 5, 15)
            enhanced_score += image_bonus
        
        # 確保分數不超過100
        return min(enhanced_score, 100.0)

