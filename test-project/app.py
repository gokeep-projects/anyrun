from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def hello():
    return '<h1>Hello from Flask App managed by AnyRun!</h1>'

@app.route('/health')
def health():
    return {'status': 'ok', 'service': 'flask-test-app'}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)