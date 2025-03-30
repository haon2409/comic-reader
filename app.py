import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# Enable CORS for all routes
CORS(app)

@app.route('/')
def index():
    """
    Redirect to the manga reader page.
    """
    return redirect('/read')

@app.route('/read')
def read():
    """
    Render the manga reader page with the requested manga and chapter.
    The manga content will be loaded client-side based on URL parameters.
    """
    return render_template('index.html')

@app.route('/api/proxy/manga/<slug>')
def proxy_manga(slug):
    """
    Proxy API calls to otruyenapi.com to avoid CORS issues
    """
    import requests
    try:
        api_url = f"https://otruyenapi.com/v1/api/truyen-tranh/{slug}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(api_url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        return jsonify(response.json())
    except Exception as e:
        app.logger.error(f"Error in proxy_manga: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/proxy/chapter/<chapter_id>')
def proxy_chapter(chapter_id):
    """
    Proxy API calls to sv1.otruyencdn.com to avoid CORS issues
    """
    import requests
    try:
        api_url = f"https://sv1.otruyencdn.com/v1/api/chapter/{chapter_id}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(api_url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        return jsonify(response.json())
    except Exception as e:
        app.logger.error(f"Error in proxy_chapter: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Error handling
@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('index.html'), 500
