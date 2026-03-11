import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from routes.analyze import analyze_bp
from routes.compress import compress_bp
from routes.klaviyo import klaviyo_bp
from utils.storage import temp_bp

app = Flask(__name__)

# Allow requests from Figma plugin
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Register blueprints
app.register_blueprint(analyze_bp)
app.register_blueprint(compress_bp)
app.register_blueprint(klaviyo_bp)
app.register_blueprint(temp_bp)


@app.route('/health')
def health():
    return {'status': 'ok'}


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', '0') == '1')
