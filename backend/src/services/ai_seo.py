import openai
import json
import re
from typing import List, Dict, Optional
import requests
from datetime import datetime

class AIService:
    def __init__(self, api_key: str = None):
        # 注意：在實際部署時，應該從環境變量獲取API密鑰
        self.api_key = api_key or "your-openai-api-key-here"
        # 由於我們無法使用真實的OpenAI API，我們將模擬AI響應
        self.mock_mode = True
    
    def _mock_ai_response(self, prompt_type: str, content: str) -> str:
        """模擬AI響應，用於演示目的"""
        if prompt_type == "title":
            return f"SEO優化標題：{content[:30]}... | 高品質商品"
        elif prompt_type == "description":
            return f"這是一個經過SEO優化的產品描述，包含相關關鍵詞。{content[:100]}...專業品質，值得信賴。"
        elif prompt_type == "alt_text":
            return f"高品質{content}產品圖片，專業攝影"
        elif prompt_type == "keywords":
            return ["SEO優化", "高品質", "專業", "推薦", "熱銷"]
        return content
    
    async def generate_seo_title(self, product_data: Dict, target_keywords: List[str] = None) -> str:
        """生成SEO優化的產品標題"""
        if self.mock_mode:
            return self._mock_ai_response("title", product_data.get('title', ''))
        
        prompt = f"""
        為以下產品生成一個SEO優化的標題：
        
        產品名稱：{product_data.get('title', '')}
        產品描述：{product_data.get('description', '')[:200]}
        目標關鍵詞：{', '.join(target_keywords) if target_keywords else '無'}
        
        要求：
        1. 標題長度控制在60個字符以內
        2. 自然地包含主要關鍵詞
        3. 吸引用戶點擊
        4. 符合SEO最佳實踐
        5. 使用繁體中文
        
        請只返回優化後的標題，不要包含其他說明文字。
        """
        
        try:
            # 這裡應該調用真實的OpenAI API
            # response = openai.ChatCompletion.create(...)
            return self._mock_ai_response("title", product_data.get('title', ''))
        except Exception as e:
            return f"AI生成失敗：{str(e)}"
    
    async def generate_meta_description(self, product_data: Dict, target_keywords: List[str] = None) -> str:
        """生成SEO優化的meta描述"""
        if self.mock_mode:
            return self._mock_ai_response("description", product_data.get('description', ''))
        
        prompt = f"""
        為以下產品生成一個SEO優化的meta描述：
        
        產品名稱：{product_data.get('title', '')}
        產品描述：{product_data.get('description', '')}
        目標關鍵詞：{', '.join(target_keywords) if target_keywords else '無'}
        
        要求：
        1. 描述長度控制在160個字符以內
        2. 包含主要關鍵詞
        3. 描述產品的主要特點和優勢
        4. 包含行動呼籲
        5. 使用繁體中文
        
        請只返回優化後的描述，不要包含其他說明文字。
        """
        
        try:
            return self._mock_ai_response("description", product_data.get('description', ''))
        except Exception as e:
            return f"AI生成失敗：{str(e)}"
    
    async def generate_alt_text(self, image_data: Dict) -> str:
        """為圖片生成alt文本"""
        if self.mock_mode:
            return self._mock_ai_response("alt_text", image_data.get('filename', ''))
        
        prompt = f"""
        為以下圖片生成描述性的alt文本：
        
        圖片文件名：{image_data.get('filename', '')}
        產品名稱：{image_data.get('product_title', '')}
        圖片位置：{image_data.get('position', '')}
        
        要求：
        1. 描述圖片的具體內容
        2. 包含產品相關關鍵詞
        3. 簡潔明了，控制在125個字符以內
        4. 使用繁體中文
        
        請只返回alt文本，不要包含其他說明文字。
        """
        
        try:
            return self._mock_ai_response("alt_text", image_data.get('product_title', ''))
        except Exception as e:
            return f"AI生成失敗：{str(e)}"
    
    async def suggest_keywords(self, product_data: Dict) -> List[str]:
        """基於產品數據建議關鍵詞"""
        if self.mock_mode:
            return self._mock_ai_response("keywords", product_data.get('title', ''))
        
        prompt = f"""
        基於以下產品信息，建議10個相關的SEO關鍵詞：
        
        產品名稱：{product_data.get('title', '')}
        產品描述：{product_data.get('description', '')}
        產品類型：{product_data.get('product_type', '')}
        
        要求：
        1. 關鍵詞與產品高度相關
        2. 包含長尾關鍵詞
        3. 考慮用戶搜索意圖
        4. 使用繁體中文
        5. 返回JSON格式的關鍵詞列表
        
        請只返回關鍵詞列表，格式：["關鍵詞1", "關鍵詞2", ...]
        """
        
        try:
            return self._mock_ai_response("keywords", product_data.get('title', ''))
        except Exception as e:
            return [f"AI生成失敗：{str(e)}"]

class SEOAnalyzer:
    """SEO分析工具"""
    
    def analyze_title(self, title: str) -> Dict:
        """分析標題的SEO表現"""
        score = 0
        issues = []
        suggestions = []
        
        # 長度檢查
        if len(title) < 30:
            issues.append("標題太短，建議至少30個字符")
            score -= 20
        elif len(title) > 60:
            issues.append("標題太長，建議控制在60個字符以內")
            score -= 15
        else:
            score += 25
        
        # 關鍵詞檢查
        if not any(keyword in title.lower() for keyword in ['seo', '優化', '高品質', '專業']):
            suggestions.append("建議在標題中包含相關關鍵詞")
            score -= 10
        else:
            score += 20
        
        # 特殊字符檢查
        if '|' in title or '-' in title:
            score += 10
        else:
            suggestions.append("建議使用分隔符（如 | 或 -）來組織標題結構")
        
        # 數字和符號
        if any(char.isdigit() for char in title):
            score += 5
        
        score = max(0, min(100, score + 50))  # 基礎分50分
        
        return {
            'score': score,
            'issues': issues,
            'suggestions': suggestions,
            'length': len(title)
        }
    
    def analyze_description(self, description: str) -> Dict:
        """分析描述的SEO表現"""
        score = 0
        issues = []
        suggestions = []
        
        # 長度檢查
        if len(description) < 120:
            issues.append("描述太短，建議至少120個字符")
            score -= 20
        elif len(description) > 160:
            issues.append("描述太長，建議控制在160個字符以內")
            score -= 15
        else:
            score += 30
        
        # 關鍵詞密度檢查
        words = description.lower().split()
        if len(words) < 15:
            issues.append("描述內容太少，建議增加更多描述性詞語")
            score -= 15
        else:
            score += 20
        
        # 行動呼籲檢查
        cta_words = ['購買', '立即', '現在', '馬上', '點擊', '查看', '了解']
        if any(cta in description for cta in cta_words):
            score += 15
        else:
            suggestions.append("建議添加行動呼籲詞語")
        
        score = max(0, min(100, score + 35))  # 基礎分35分
        
        return {
            'score': score,
            'issues': issues,
            'suggestions': suggestions,
            'length': len(description),
            'word_count': len(words)
        }
    
    def calculate_overall_seo_score(self, product_data: Dict) -> float:
        """計算產品的整體SEO分數"""
        title_analysis = self.analyze_title(product_data.get('title', ''))
        description_analysis = self.analyze_description(product_data.get('description', ''))
        
        # 權重分配
        title_weight = 0.4
        description_weight = 0.3
        other_weight = 0.3
        
        title_score = title_analysis['score']
        description_score = description_analysis['score']
        
        # 其他因素評分
        other_score = 50  # 基礎分
        
        # 檢查是否有圖片alt文本
        if product_data.get('images'):
            other_score += 20
        
        # 檢查是否有標籤
        if product_data.get('tags'):
            other_score += 15
        
        # 檢查是否有變體
        if product_data.get('variants'):
            other_score += 15
        
        overall_score = (
            title_score * title_weight +
            description_score * description_weight +
            other_score * other_weight
        )
        
        return round(overall_score, 1)

class KeywordResearcher:
    """關鍵詞研究工具"""
    
    def __init__(self):
        self.mock_data = {
            'seo優化': {'volume': 1200, 'difficulty': 65},
            '高品質': {'volume': 800, 'difficulty': 45},
            '專業': {'volume': 950, 'difficulty': 55},
            '推薦': {'volume': 1500, 'difficulty': 70},
            '熱銷': {'volume': 600, 'difficulty': 40}
        }
    
    def research_keywords(self, seed_keywords: List[str]) -> List[Dict]:
        """研究關鍵詞數據"""
        results = []
        
        for keyword in seed_keywords:
            # 在實際應用中，這裡會調用真實的關鍵詞研究API
            data = self.mock_data.get(keyword, {
                'volume': 500,
                'difficulty': 50
            })
            
            results.append({
                'keyword': keyword,
                'search_volume': data['volume'],
                'difficulty': data['difficulty'],
                'competition': 'medium',
                'trend': 'stable'
            })
        
        return results
    
    def suggest_related_keywords(self, main_keyword: str) -> List[str]:
        """建議相關關鍵詞"""
        # 模擬相關關鍵詞建議
        related_keywords = [
            f"{main_keyword} 推薦",
            f"{main_keyword} 評價",
            f"{main_keyword} 價格",
            f"最佳 {main_keyword}",
            f"{main_keyword} 比較"
        ]
        
        return related_keywords[:5]

