from flask import Blueprint, request, jsonify
from src.services.deepseek_ai import DeepSeekAIService
from src.models.seo import SeoTask
from src.models.user import db
import json
from datetime import datetime

seo_bp = Blueprint('seo', __name__)

# Initialize DeepSeek AI service
ai_service = DeepSeekAIService("sk-f2164aa18c9747679dd18784e31f4f6d")

@seo_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "AI SEO Master",
        "timestamp": datetime.utcnow().isoformat()
    })

@seo_bp.route('/generate-title', methods=['POST'])
def generate_title():
    """Generate SEO-optimized title using DeepSeek AI"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract parameters
        original_title = data.get('product_title', '')
        description = data.get('product_description', '')
        language = data.get('language', 'en')
        keywords = data.get('keywords', [])
        
        if not original_title:
            return jsonify({"error": "Product title is required"}), 400
        
        # Generate optimized title using DeepSeek AI
        result = ai_service.generate_title(
            product_title=original_title,
            product_description=description,
            language=language,
            keywords=keywords
        )
        
        # Save task to database
        task = SeoTask(
            task_type='title_generation',
            input_data=json.dumps(data),
            output_data=json.dumps(result),
            status='completed',
            language=language
        )
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "task_id": task.id,
            "original_title": result["original_title"],
            "optimized_title": result["optimized_title"],
            "language": result["language"],
            "improvements": result["improvements"],
            "seo_score": result["seo_score"],
            "timestamp": result["timestamp"]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to generate title: {str(e)}"
        }), 500

@seo_bp.route('/generate-description', methods=['POST'])
def generate_description():
    """Generate SEO-optimized description using DeepSeek AI"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract parameters
        title = data.get('product_title', '')
        original_description = data.get('product_description', '')
        language = data.get('language', 'en')
        keywords = data.get('keywords', [])
        
        if not title:
            return jsonify({"error": "Product title is required"}), 400
        
        # Generate optimized description using DeepSeek AI
        result = ai_service.generate_description(
            product_title=title,
            product_description=original_description,
            language=language,
            keywords=keywords
        )
        
        # Save task to database
        task = SeoTask(
            task_type='description_generation',
            input_data=json.dumps(data),
            output_data=json.dumps(result),
            status='completed',
            language=language
        )
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "task_id": task.id,
            "original_description": result["original_description"],
            "optimized_description": result["optimized_description"],
            "language": result["language"],
            "improvements": result["improvements"],
            "seo_score": result["seo_score"],
            "timestamp": result["timestamp"]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to generate description: {str(e)}"
        }), 500

@seo_bp.route('/generate-blog', methods=['POST'])
def generate_blog():
    """Generate SEO-optimized blog article using DeepSeek AI"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract parameters
        topic = data.get('topic', '')
        target_keywords = data.get('keywords', [])
        language = data.get('language', 'en')
        length = data.get('length', 'medium')  # short, medium, long
        
        if not topic:
            return jsonify({"error": "Blog topic is required"}), 400
        
        # Generate blog article using DeepSeek AI
        result = ai_service.generate_blog_article(
            topic=topic,
            target_keywords=target_keywords,
            language=language,
            length=length
        )
        
        # Save task to database
        task = SeoTask(
            task_type='blog_generation',
            input_data=json.dumps(data),
            output_data=json.dumps(result),
            status='completed',
            language=language
        )
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "task_id": task.id,
            "topic": result["topic"],
            "content": result["content"],
            "meta_description": result["meta_description"],
            "language": result["language"],
            "length": result["length"],
            "target_keywords": result["target_keywords"],
            "word_count": result["word_count"],
            "seo_score": result["seo_score"],
            "timestamp": result["timestamp"]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to generate blog article: {str(e)}"
        }), 500

@seo_bp.route('/generate-keywords', methods=['POST'])
def generate_keywords():
    """Generate relevant keywords using DeepSeek AI"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract parameters
        topic = data.get('topic', '')
        language = data.get('language', 'en')
        count = data.get('count', 10)
        
        if not topic:
            return jsonify({"error": "Topic is required"}), 400
        
        # Generate keywords using DeepSeek AI
        result = ai_service.generate_keywords(
            topic=topic,
            language=language,
            count=count
        )
        
        # Save task to database
        task = SeoTask(
            task_type='keyword_generation',
            input_data=json.dumps(data),
            output_data=json.dumps(result),
            status='completed',
            language=language
        )
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "task_id": task.id,
            "topic": result["topic"],
            "language": result["language"],
            "keywords": result["keywords"],
            "count": result["count"],
            "timestamp": result["timestamp"]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to generate keywords: {str(e)}"
        }), 500

@seo_bp.route('/audit', methods=['POST'])
def seo_audit():
    """Perform SEO audit using DeepSeek AI"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract parameters
        title = data.get('title', '')
        description = data.get('description', '')
        content = data.get('content', '')
        language = data.get('language', 'en')
        
        if not title and not description:
            return jsonify({"error": "Title or description is required"}), 400
        
        # Perform SEO analysis using DeepSeek AI
        result = ai_service.analyze_seo_content(
            title=title,
            description=description,
            content=content,
            language=language
        )
        
        # Save task to database
        task = SeoTask(
            task_type='seo_audit',
            input_data=json.dumps(data),
            output_data=json.dumps(result),
            status='completed',
            language=language
        )
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "task_id": task.id,
            "title": result["title"],
            "description": result["description"],
            "language": result["language"],
            "seo_score": result["seo_score"],
            "analysis": result["analysis"],
            "recommendations": result["recommendations"],
            "timestamp": result["timestamp"]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to perform SEO audit: {str(e)}"
        }), 500

@seo_bp.route('/detect-language', methods=['POST'])
def detect_language():
    """Detect language of the provided text"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Simple language detection based on common patterns
        # In production, you might want to use a more sophisticated library
        language_patterns = {
            'es': ['el', 'la', 'de', 'en', 'con', 'para', 'por', 'que', 'se', 'su'],
            'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'],
            'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
            'zh': ['的', '是', '在', '了', '不', '和', '有', '大', '这', '主'],
            'ja': ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し'],
        }
        
        text_lower = text.lower()
        language_scores = {}
        
        for lang, patterns in language_patterns.items():
            score = sum(1 for pattern in patterns if pattern in text_lower)
            language_scores[lang] = score
        
        # Default to English if no clear pattern
        detected_language = max(language_scores, key=language_scores.get) if max(language_scores.values()) > 0 else 'en'
        confidence = max(language_scores.values()) / len(text.split()) if text.split() else 0
        
        return jsonify({
            "success": True,
            "detected_language": detected_language,
            "confidence": min(confidence, 1.0),
            "all_scores": language_scores
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to detect language: {str(e)}"
        }), 500

@seo_bp.route('/tasks', methods=['GET'])
def get_tasks():
    """Get recent SEO tasks"""
    try:
        limit = request.args.get('limit', 10, type=int)
        task_type = request.args.get('type', None)
        
        query = SeoTask.query
        
        if task_type:
            query = query.filter_by(task_type=task_type)
        
        tasks = query.order_by(SeoTask.created_at.desc()).limit(limit).all()
        
        return jsonify({
            "success": True,
            "tasks": [{
                "id": task.id,
                "task_type": task.task_type,
                "status": task.status,
                "language": task.language,
                "created_at": task.created_at.isoformat(),
                "updated_at": task.updated_at.isoformat()
            } for task in tasks]
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to get tasks: {str(e)}"
        }), 500

@seo_bp.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """Get specific task details"""
    try:
        task = SeoTask.query.get_or_404(task_id)
        
        return jsonify({
            "success": True,
            "task": {
                "id": task.id,
                "task_type": task.task_type,
                "input_data": json.loads(task.input_data) if task.input_data else {},
                "output_data": json.loads(task.output_data) if task.output_data else {},
                "status": task.status,
                "language": task.language,
                "created_at": task.created_at.isoformat(),
                "updated_at": task.updated_at.isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to get task: {str(e)}"
        }), 500

