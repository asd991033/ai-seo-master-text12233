import re
import json
from typing import Dict, List, Optional, Tuple
import requests

class MultiLanguageSEOService:
    """Multi-language SEO optimization service with language detection"""
    
    def __init__(self):
        self.supported_languages = {
            'en': {'name': 'English', 'flag': '🇺🇸', 'market': 'US'},
            'es': {'name': 'Spanish', 'flag': '🇪🇸', 'market': 'ES'},
            'fr': {'name': 'French', 'flag': '🇫🇷', 'market': 'FR'},
            'de': {'name': 'German', 'flag': '🇩🇪', 'market': 'DE'},
            'it': {'name': 'Italian', 'flag': '🇮🇹', 'market': 'IT'},
            'pt': {'name': 'Portuguese', 'flag': '🇵🇹', 'market': 'PT'},
            'zh': {'name': 'Chinese', 'flag': '🇨🇳', 'market': 'CN'},
            'ja': {'name': 'Japanese', 'flag': '🇯🇵', 'market': 'JP'},
            'ko': {'name': 'Korean', 'flag': '🇰🇷', 'market': 'KR'},
            'ru': {'name': 'Russian', 'flag': '🇷🇺', 'market': 'RU'},
            'ar': {'name': 'Arabic', 'flag': '🇸🇦', 'market': 'SA'},
            'hi': {'name': 'Hindi', 'flag': '🇮🇳', 'market': 'IN'}
        }
        
        # Language detection patterns
        self.language_patterns = {
            'en': [
                r'\b(the|and|or|but|in|on|at|to|for|of|with|by)\b',
                r'\b(product|quality|premium|professional|service)\b'
            ],
            'es': [
                r'\b(el|la|los|las|y|o|pero|en|de|con|por|para)\b',
                r'\b(producto|calidad|premium|profesional|servicio)\b'
            ],
            'fr': [
                r'\b(le|la|les|et|ou|mais|dans|de|avec|par|pour)\b',
                r'\b(produit|qualité|premium|professionnel|service)\b'
            ],
            'de': [
                r'\b(der|die|das|und|oder|aber|in|von|mit|für)\b',
                r'\b(produkt|qualität|premium|professionell|service)\b'
            ],
            'zh': [
                r'[的|和|或|但|在|与|为|由|从]',
                r'[产品|质量|优质|专业|服务]'
            ],
            'ja': [
                r'[の|と|や|が|を|に|で|から|まで]',
                r'[製品|品質|プレミアム|プロ|サービス]'
            ]
        }
        
        # SEO keywords by language and market
        self.seo_keywords = {
            'en': {
                'quality_words': ['premium', 'high-quality', 'professional', 'top-rated', 'best'],
                'action_words': ['buy', 'shop', 'get', 'order', 'purchase'],
                'descriptive': ['durable', 'reliable', 'innovative', 'advanced', 'superior']
            },
            'es': {
                'quality_words': ['premium', 'alta calidad', 'profesional', 'mejor valorado', 'mejor'],
                'action_words': ['comprar', 'tienda', 'obtener', 'pedir', 'adquirir'],
                'descriptive': ['duradero', 'confiable', 'innovador', 'avanzado', 'superior']
            },
            'fr': {
                'quality_words': ['premium', 'haute qualité', 'professionnel', 'mieux noté', 'meilleur'],
                'action_words': ['acheter', 'boutique', 'obtenir', 'commander', 'acquérir'],
                'descriptive': ['durable', 'fiable', 'innovant', 'avancé', 'supérieur']
            },
            'de': {
                'quality_words': ['premium', 'hochwertig', 'professionell', 'bestbewertet', 'beste'],
                'action_words': ['kaufen', 'shop', 'erhalten', 'bestellen', 'erwerben'],
                'descriptive': ['langlebig', 'zuverlässig', 'innovativ', 'fortschrittlich', 'überlegen']
            }
        }

    def detect_language(self, text: str) -> Tuple[str, float]:
        """
        Detect the language of the given text
        Returns: (language_code, confidence_score)
        """
        if not text or len(text.strip()) < 3:
            return 'en', 0.5  # Default to English with low confidence
        
        text_lower = text.lower()
        scores = {}
        
        for lang_code, patterns in self.language_patterns.items():
            score = 0
            total_patterns = len(patterns)
            
            for pattern in patterns:
                matches = len(re.findall(pattern, text_lower, re.IGNORECASE))
                if matches > 0:
                    score += min(matches / len(text.split()) * 10, 1.0)
            
            scores[lang_code] = score / total_patterns if total_patterns > 0 else 0
        
        # Find the language with the highest score
        if scores:
            best_lang = max(scores.keys(), key=lambda k: scores[k])
            confidence = min(scores[best_lang], 1.0)
            
            # If confidence is too low, default to English
            if confidence < 0.1:
                return 'en', 0.5
            
            return best_lang, confidence
        
        return 'en', 0.5

    def generate_localized_title(self, original_title: str, target_language: str = None) -> Dict:
        """
        Generate SEO-optimized title for the target language
        """
        if not target_language:
            target_language, _ = self.detect_language(original_title)
        
        # Get language-specific keywords
        keywords = self.seo_keywords.get(target_language, self.seo_keywords['en'])
        
        # Generate optimized title based on language
        if target_language == 'en':
            optimized_title = self._optimize_english_title(original_title, keywords)
        elif target_language == 'es':
            optimized_title = self._optimize_spanish_title(original_title, keywords)
        elif target_language == 'fr':
            optimized_title = self._optimize_french_title(original_title, keywords)
        elif target_language == 'de':
            optimized_title = self._optimize_german_title(original_title, keywords)
        else:
            # For other languages, use English optimization as fallback
            optimized_title = self._optimize_english_title(original_title, keywords)
        
        return {
            'original_title': original_title,
            'optimized_title': optimized_title,
            'language': target_language,
            'language_info': self.supported_languages.get(target_language, {}),
            'seo_improvements': self._analyze_title_improvements(original_title, optimized_title, target_language)
        }

    def generate_localized_description(self, original_description: str, title: str = "", target_language: str = None) -> Dict:
        """
        Generate SEO-optimized description for the target language
        """
        if not target_language:
            target_language, _ = self.detect_language(original_description)
        
        # Get language-specific keywords
        keywords = self.seo_keywords.get(target_language, self.seo_keywords['en'])
        
        # Generate optimized description based on language
        if target_language == 'en':
            optimized_description = self._optimize_english_description(original_description, title, keywords)
        elif target_language == 'es':
            optimized_description = self._optimize_spanish_description(original_description, title, keywords)
        elif target_language == 'fr':
            optimized_description = self._optimize_french_description(original_description, title, keywords)
        elif target_language == 'de':
            optimized_description = self._optimize_german_description(original_description, title, keywords)
        else:
            # For other languages, use English optimization as fallback
            optimized_description = self._optimize_english_description(original_description, title, keywords)
        
        return {
            'original_description': original_description,
            'optimized_description': optimized_description,
            'language': target_language,
            'language_info': self.supported_languages.get(target_language, {}),
            'seo_improvements': self._analyze_description_improvements(original_description, optimized_description, target_language)
        }

    def _optimize_english_title(self, title: str, keywords: Dict) -> str:
        """Optimize title for English market"""
        # Add quality words if not present
        if not any(word in title.lower() for word in keywords['quality_words']):
            title = f"Premium {title}"
        
        # Add descriptive words
        if len(title.split()) < 5:
            descriptive = keywords['descriptive'][0]
            title = f"{title} | {descriptive.title()}"
        
        # Ensure proper capitalization
        return title.title()

    def _optimize_spanish_title(self, title: str, keywords: Dict) -> str:
        """Optimize title for Spanish market"""
        if not any(word in title.lower() for word in keywords['quality_words']):
            title = f"{title} Premium"
        
        if len(title.split()) < 5:
            descriptive = keywords['descriptive'][0]
            title = f"{title} | {descriptive.title()}"
        
        return title.title()

    def _optimize_french_title(self, title: str, keywords: Dict) -> str:
        """Optimize title for French market"""
        if not any(word in title.lower() for word in keywords['quality_words']):
            title = f"{title} Premium"
        
        if len(title.split()) < 5:
            descriptive = keywords['descriptive'][0]
            title = f"{title} | {descriptive.title()}"
        
        return title.title()

    def _optimize_german_title(self, title: str, keywords: Dict) -> str:
        """Optimize title for German market"""
        if not any(word in title.lower() for word in keywords['quality_words']):
            title = f"Premium {title}"
        
        if len(title.split()) < 5:
            descriptive = keywords['descriptive'][0]
            title = f"{title} | {descriptive.title()}"
        
        return title.title()

    def _optimize_english_description(self, description: str, title: str, keywords: Dict) -> str:
        """Optimize description for English market"""
        optimized = f"Professional AI-optimized product description. {description}"
        
        # Add quality keywords
        if not any(word in description.lower() for word in keywords['quality_words']):
            optimized += f" Premium quality and {keywords['descriptive'][0]} design."
        
        # Add call to action
        if not any(word in description.lower() for word in keywords['action_words']):
            optimized += f" {keywords['action_words'][0].title()} now for the best experience."
        
        return optimized

    def _optimize_spanish_description(self, description: str, title: str, keywords: Dict) -> str:
        """Optimize description for Spanish market"""
        optimized = f"Descripción de producto optimizada profesionalmente con IA. {description}"
        
        if not any(word in description.lower() for word in keywords['quality_words']):
            optimized += f" Calidad premium y diseño {keywords['descriptive'][0]}."
        
        if not any(word in description.lower() for word in keywords['action_words']):
            optimized += f" {keywords['action_words'][0].title()} ahora para la mejor experiencia."
        
        return optimized

    def _optimize_french_description(self, description: str, title: str, keywords: Dict) -> str:
        """Optimize description for French market"""
        optimized = f"Description de produit optimisée professionnellement par IA. {description}"
        
        if not any(word in description.lower() for word in keywords['quality_words']):
            optimized += f" Qualité premium et design {keywords['descriptive'][0]}."
        
        if not any(word in description.lower() for word in keywords['action_words']):
            optimized += f" {keywords['action_words'][0].title()} maintenant pour la meilleure expérience."
        
        return optimized

    def _optimize_german_description(self, description: str, title: str, keywords: Dict) -> str:
        """Optimize description for German market"""
        optimized = f"Professionell KI-optimierte Produktbeschreibung. {description}"
        
        if not any(word in description.lower() for word in keywords['quality_words']):
            optimized += f" Premium-Qualität und {keywords['descriptive'][0]} Design."
        
        if not any(word in description.lower() for word in keywords['action_words']):
            optimized += f" {keywords['action_words'][0].title()} Sie jetzt für die beste Erfahrung."
        
        return optimized

    def _analyze_title_improvements(self, original: str, optimized: str, language: str) -> List[str]:
        """Analyze what improvements were made to the title"""
        improvements = []
        
        if len(optimized.split()) > len(original.split()):
            improvements.append("Added descriptive keywords")
        
        if '|' in optimized and '|' not in original:
            improvements.append("Added structured formatting")
        
        keywords = self.seo_keywords.get(language, self.seo_keywords['en'])
        if any(word in optimized.lower() for word in keywords['quality_words']):
            improvements.append("Enhanced with quality indicators")
        
        if not improvements:
            improvements.append("Optimized for better search visibility")
        
        return improvements

    def _analyze_description_improvements(self, original: str, optimized: str, language: str) -> List[str]:
        """Analyze what improvements were made to the description"""
        improvements = []
        
        if len(optimized) > len(original) * 1.2:
            improvements.append("Extended content for better SEO")
        
        keywords = self.seo_keywords.get(language, self.seo_keywords['en'])
        if any(word in optimized.lower() for word in keywords['action_words']):
            improvements.append("Added call-to-action")
        
        if any(word in optimized.lower() for word in keywords['quality_words']):
            improvements.append("Enhanced with quality keywords")
        
        if "AI" in optimized or "optimized" in optimized.lower():
            improvements.append("Added professional optimization indicators")
        
        if not improvements:
            improvements.append("Optimized for better search ranking")
        
        return improvements

    def get_supported_languages(self) -> Dict:
        """Get list of supported languages"""
        return self.supported_languages

    def analyze_market_seo(self, text: str, target_language: str) -> Dict:
        """Analyze SEO potential for specific market"""
        language_info = self.supported_languages.get(target_language, {})
        keywords = self.seo_keywords.get(target_language, self.seo_keywords['en'])
        
        # Calculate SEO score based on keyword presence
        score = 50  # Base score
        
        text_lower = text.lower()
        
        # Check for quality words
        quality_matches = sum(1 for word in keywords['quality_words'] if word in text_lower)
        score += min(quality_matches * 10, 30)
        
        # Check for action words
        action_matches = sum(1 for word in keywords['action_words'] if word in text_lower)
        score += min(action_matches * 5, 15)
        
        # Check for descriptive words
        desc_matches = sum(1 for word in keywords['descriptive'] if word in text_lower)
        score += min(desc_matches * 3, 10)
        
        # Length bonus
        word_count = len(text.split())
        if 10 <= word_count <= 60:
            score += 5
        
        return {
            'language': target_language,
            'language_info': language_info,
            'seo_score': min(score, 100),
            'keyword_analysis': {
                'quality_keywords': quality_matches,
                'action_keywords': action_matches,
                'descriptive_keywords': desc_matches
            },
            'recommendations': self._get_seo_recommendations(score, target_language)
        }

    def _get_seo_recommendations(self, score: int, language: str) -> List[str]:
        """Get SEO recommendations based on score"""
        recommendations = []
        
        if score < 60:
            recommendations.append(f"Add more quality keywords for {language} market")
            recommendations.append("Include call-to-action phrases")
        
        if score < 70:
            recommendations.append("Enhance with descriptive adjectives")
            recommendations.append("Optimize content length")
        
        if score < 80:
            recommendations.append("Add market-specific terminology")
            recommendations.append("Include brand positioning words")
        
        if not recommendations:
            recommendations.append("Content is well-optimized for SEO")
        
        return recommendations

