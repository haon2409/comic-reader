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
    Redirect to the read page or show an empty manga reader.
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
    api_url = f"https://otruyenapi.com/v1/api/truyen-tranh/{slug}"
    response = requests.get(api_url)
    return jsonify(response.json())

@app.route('/api/proxy/chapter/<chapter_id>')
def proxy_chapter(chapter_id):
    """
    Proxy API calls to sv1.otruyencdn.com to avoid CORS issues
    """
    import requests
    api_url = f"https://sv1.otruyencdn.com/v1/api/chapter/{chapter_id}"
    response = requests.get(api_url)
    return jsonify(response.json())

# Error handling
@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('index.html'), 500
