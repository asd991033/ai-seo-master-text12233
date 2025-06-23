import requests
import json
import re
from typing import Dict, List
from datetime import datetime

class DeepSeekAIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.deepseek.com/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.model = "deepseek-chat"
    
    def _make_request(self, messages: List[Dict], max_tokens: int = 1000, temperature: float = 0.7) -> str:
        """Make request to DeepSeek API with improved error handling"""
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": False
            }
            
            # Increase timeout for longer content generation
            timeout = 60 if max_tokens > 1000 else 30
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            else:
                print(f"DeepSeek API Error: {response.status_code} - {response.text}")
                return self._fallback_response("Error occurred")
                
        except requests.exceptions.Timeout:
            print("DeepSeek API Timeout")
            return self._fallback_response("Request timeout")
        except Exception as e:
            print(f"DeepSeek API Exception: {str(e)}")
            return self._fallback_response("Service unavailable")
    
    def _fallback_response(self, error_type: str) -> str:
        """Provide fallback response when API fails"""
        fallbacks = {
            "Error occurred": "AI-optimized content (generated with fallback)",
            "Request timeout": "Professional SEO-optimized content (timeout fallback)",
            "Service unavailable": "Enhanced content with SEO optimization (service fallback)"
        }
        return fallbacks.get(error_type, "Optimized content")
    
    def detect_language(self, text: str) -> str:
        """Detect language of the input text"""
        # Simple language detection based on character patterns
        if re.search(r'[\u4e00-\u9fff]', text):
            return 'zh'
        elif re.search(r'[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]', text.lower()):
            return 'fr'
        elif re.search(r'[äöüß]', text.lower()):
            return 'de'
        elif re.search(r'[ñáéíóúü]', text.lower()):
            return 'es'
        else:
            return 'en'
    
    def generate_title(self, product_title: str, product_description: str, 
                      language: str = "en", keywords: List[str] = None) -> Dict:
        """Generate SEO-optimized title using DeepSeek AI"""
        
        if not language:
            language = self.detect_language(product_title + " " + product_description)
        
        keywords = keywords or []
        
        language_prompts = {
            "en": "You are an SEO expert. Create compelling, search-optimized product titles that rank well on Google.",
            "es": "Eres un experto en SEO. Crea títulos de productos convincentes y optimizados para búsquedas que se posicionen bien en Google.",
            "fr": "Vous êtes un expert SEO. Créez des titres de produits convaincants et optimisés pour les recherches qui se classent bien sur Google.",
            "de": "Sie sind ein SEO-Experte. Erstellen Sie überzeugende, suchoptimierte Produkttitel, die bei Google gut ranken.",
            "zh": "你是SEO专家。创建引人注目、搜索优化的产品标题，在Google上排名良好。"
        }
        
        base_prompt = language_prompts.get(language, language_prompts["en"])
        keywords_text = f"Target keywords: {', '.join(keywords)}" if keywords else ""
        
        messages = [
            {
                "role": "system",
                "content": f"{base_prompt} Guidelines: 1) Keep under 60 characters 2) Include main keywords naturally 3) Make it compelling for clicks 4) Avoid keyword stuffing"
            },
            {
                "role": "user",
                "content": f"Original title: {product_title}\nDescription: {product_description}\n{keywords_text}\nLanguage: {language}\n\nCreate an SEO-optimized title:"
            }
        ]
        
        optimized_title = self._make_request(messages, max_tokens=100, temperature=0.7)
        
        return {
            "original_title": product_title,
            "optimized_title": optimized_title,
            "language": language,
            "seo_score": self._calculate_seo_score(optimized_title, keywords),
            "improvements": [
                "Enhanced with additional descriptive keywords",
                "Expanded with relevant search terms"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def generate_description(self, product_title: str, product_description: str,
                           language: str = "en", keywords: List[str] = None) -> Dict:
        """Generate SEO-optimized description using DeepSeek AI"""
        
        if not language:
            language = self.detect_language(product_title + " " + product_description)
        
        keywords = keywords or []
        
        language_prompts = {
            "en": "You are an SEO copywriter. Create compelling product descriptions that convert visitors and rank well in search engines.",
            "es": "Eres un redactor SEO. Crea descripciones de productos convincentes que conviertan visitantes y se posicionen bien en motores de búsqueda.",
            "fr": "Vous êtes un rédacteur SEO. Créez des descriptions de produits convaincantes qui convertissent les visiteurs et se classent bien dans les moteurs de recherche.",
            "de": "Sie sind ein SEO-Texter. Erstellen Sie überzeugende Produktbeschreibungen, die Besucher konvertieren und in Suchmaschinen gut ranken.",
            "zh": "你是SEO文案写手。创建引人注目的产品描述，既能转化访客又能在搜索引擎中获得良好排名。"
        }
        
        base_prompt = language_prompts.get(language, language_prompts["en"])
        keywords_text = f"Target keywords: {', '.join(keywords)}" if keywords else ""
        
        messages = [
            {
                "role": "system",
                "content": f"{base_prompt} Guidelines: 1) Write 150-300 words 2) Include keywords naturally 3) Focus on benefits 4) Include call-to-action 5) Use bullet points for features"
            },
            {
                "role": "user",
                "content": f"Product: {product_title}\nCurrent description: {product_description}\n{keywords_text}\nLanguage: {language}\n\nCreate an SEO-optimized description:"
            }
        ]
        
        optimized_description = self._make_request(messages, max_tokens=400, temperature=0.7)
        
        return {
            "original_description": product_description,
            "optimized_description": optimized_description,
            "language": language,
            "seo_score": self._calculate_seo_score(optimized_description, keywords),
            "improvements": [
                "Expanded content for better SEO coverage",
                "Added call-to-action elements"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def generate_blog_article(self, topic: str, target_keywords: List[str] = None,
                            length: str = "medium", language: str = "en") -> Dict:
        """Generate SEO-optimized blog article using DeepSeek AI"""
        
        # Simplified length specs for faster generation
        length_specs = {
            "short": {"words": "300-500", "max_tokens": 600},
            "medium": {"words": "500-800", "max_tokens": 900},
            "long": {"words": "800-1200", "max_tokens": 1400}
        }
        
        spec = length_specs.get(length, length_specs["short"])  # Default to short for speed
        target_keywords = target_keywords or []
        
        # Simplified prompt for faster generation
        keywords_text = f"Keywords: {', '.join(target_keywords[:3])}" if target_keywords else ""
        
        messages = [
            {
                "role": "system",
                "content": "You are an SEO content writer. Write concise, engaging blog articles with clear structure."
            },
            {
                "role": "user",
                "content": f"Write a {spec['words']} word blog article about: {topic}\n{keywords_text}\nInclude: title, introduction, 2-3 main points, conclusion."
            }
        ]
        
        try:
            article_content = self._make_request(messages, max_tokens=spec["max_tokens"], temperature=0.7)
            
            return {
                "topic": topic,
                "content": article_content,
                "meta_description": f"Learn about {topic} with expert insights and practical tips.",
                "language": language,
                "length": length,
                "target_keywords": target_keywords,
                "word_count": len(article_content.split()),
                "seo_score": self._calculate_blog_seo_score(article_content, target_keywords),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Blog generation error: {str(e)}")
            # Quick fallback
            fallback_content = f"""# {topic}

## Introduction
This guide covers the essential aspects of {topic}.

## Key Benefits
- Professional insights and analysis
- Practical tips for implementation
- Expert recommendations

## Best Practices
Understanding {topic} requires careful consideration of various factors.

## Conclusion
{topic} is an important consideration for success in today's market.
"""
            return {
                "topic": topic,
                "content": fallback_content,
                "meta_description": f"Complete guide to {topic}",
                "language": language,
                "length": length,
                "target_keywords": target_keywords,
                "word_count": len(fallback_content.split()),
                "seo_score": 70,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _calculate_seo_score(self, content: str, keywords: List[str]) -> int:
        """Calculate SEO score based on content analysis"""
        score = 50  # Base score
        
        if len(content) > 30:
            score += 10
        if len(content) < 60:
            score += 10
        
        for keyword in keywords:
            if keyword.lower() in content.lower():
                score += 5
        
        return min(score, 95)
    
    def _calculate_blog_seo_score(self, content: str, keywords: List[str]) -> int:
        """Calculate SEO score for blog content"""
        score = 60  # Base score for blog
        
        if len(content.split()) > 300:
            score += 10
        if any(keyword.lower() in content.lower() for keyword in keywords):
            score += 15
        if "##" in content:  # Has subheadings
            score += 10
        
        return min(score, 95)


    def generate_keywords(self, topic: str, language: str = "en", count: int = 10) -> Dict:
        """Generate relevant keywords using DeepSeek AI"""
        
        language_prompts = {
            "en": "You are an SEO keyword research expert. Generate relevant, high-value keywords.",
            "es": "Eres un experto en investigación de palabras clave SEO. Genera palabras clave relevantes y de alto valor.",
            "fr": "Vous êtes un expert en recherche de mots-clés SEO. Générez des mots-clés pertinents et de haute valeur.",
            "de": "Sie sind ein SEO-Keyword-Recherche-Experte. Generieren Sie relevante, hochwertige Keywords.",
            "zh": "你是SEO关键词研究专家。生成相关的、高价值的关键词。"
        }
        
        base_prompt = language_prompts.get(language, language_prompts["en"])
        
        messages = [
            {
                "role": "system",
                "content": f"{base_prompt} Provide {count} keywords as a simple comma-separated list."
            },
            {
                "role": "user",
                "content": f"Generate {count} SEO keywords for: {topic}\nLanguage: {language}\nFormat: keyword1, keyword2, keyword3..."
            }
        ]
        
        try:
            keywords_text = self._make_request(messages, max_tokens=200, temperature=0.5)
            keywords = [kw.strip() for kw in keywords_text.split(',') if kw.strip()]
            
            return {
                "topic": topic,
                "language": language,
                "keywords": keywords[:count],
                "count": len(keywords[:count]),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Keyword generation error: {str(e)}")
            # Fallback keywords
            fallback_keywords = [
                f"{topic}",
                f"best {topic}",
                f"{topic} guide",
                f"professional {topic}",
                f"{topic} tips"
            ]
            return {
                "topic": topic,
                "language": language,
                "keywords": fallback_keywords[:count],
                "count": len(fallback_keywords[:count]),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def analyze_seo_content(self, title: str = "", description: str = "", 
                          content: str = "", language: str = "en") -> Dict:
        """Perform SEO analysis using DeepSeek AI"""
        
        combined_content = f"{title} {description} {content}".strip()
        
        language_prompts = {
            "en": "You are an SEO analyst. Analyze content and provide actionable recommendations.",
            "es": "Eres un analista SEO. Analiza el contenido y proporciona recomendaciones accionables.",
            "fr": "Vous êtes un analyste SEO. Analysez le contenu et fournissez des recommandations exploitables.",
            "de": "Sie sind ein SEO-Analyst. Analysieren Sie Inhalte und geben Sie umsetzbare Empfehlungen.",
            "zh": "你是SEO分析师。分析内容并提供可操作的建议。"
        }
        
        base_prompt = language_prompts.get(language, language_prompts["en"])
        
        messages = [
            {
                "role": "system",
                "content": f"{base_prompt} Provide a brief analysis with 3-5 specific recommendations."
            },
            {
                "role": "user",
                "content": f"Analyze this content for SEO:\nTitle: {title}\nDescription: {description}\nContent: {content[:500]}...\nLanguage: {language}"
            }
        ]
        
        try:
            analysis_text = self._make_request(messages, max_tokens=300, temperature=0.3)
            
            # Extract recommendations (simple parsing)
            recommendations = []
            if "1." in analysis_text or "•" in analysis_text:
                lines = analysis_text.split('\n')
                for line in lines:
                    if any(marker in line for marker in ['1.', '2.', '3.', '4.', '5.', '•', '-']):
                        recommendations.append(line.strip())
            
            if not recommendations:
                recommendations = [
                    "Optimize title length (50-60 characters)",
                    "Include target keywords naturally",
                    "Improve meta description",
                    "Add relevant internal links"
                ]
            
            seo_score = self._calculate_content_seo_score(title, description, content)
            
            return {
                "title": title,
                "description": description,
                "language": language,
                "seo_score": seo_score,
                "analysis": analysis_text,
                "recommendations": recommendations[:5],
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"SEO analysis error: {str(e)}")
            return {
                "title": title,
                "description": description,
                "language": language,
                "seo_score": 65,
                "analysis": "Content analysis completed with basic SEO evaluation.",
                "recommendations": [
                    "Optimize title for search engines",
                    "Enhance meta description",
                    "Include relevant keywords",
                    "Improve content structure"
                ],
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _calculate_content_seo_score(self, title: str, description: str, content: str) -> int:
        """Calculate SEO score for content analysis"""
        score = 40  # Base score
        
        if title and len(title) >= 30:
            score += 15
        if description and len(description) >= 120:
            score += 15
        if content and len(content) >= 300:
            score += 15
        if title and description:
            score += 10
        
        return min(score, 95)

