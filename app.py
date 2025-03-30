import os
from flask import Flask, render_template, request

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

@app.route('/')
def index():
    """
    Render the index page with manga reader.
    The manga content will be loaded client-side based on URL parameters.
    """
    return render_template('index.html')

# Error handling
@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('index.html'), 500
