from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import os, uuid, sqlite3, datetime

BASE_DIR = os.path.dirname(__file__)
RECORDINGS_DIR = os.path.join(BASE_DIR, 'recordings')
DB_PATH = os.path.join(BASE_DIR, 'data.db')
PROMPTS_CSV = os.path.join(BASE_DIR, 'prompts', 'prompts.csv')

os.makedirs(RECORDINGS_DIR, exist_ok=True)
app = Flask(__name__)
CORS(app)

def load_prompts():
    prompts = []
    if os.path.exists(PROMPTS_CSV):
        with open(PROMPTS_CSV, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                text = line.strip()
                if not text:
                    continue
                prompts.append({'id': str(i+1), 'text': text})
    return prompts

PROMPTS = load_prompts()

def db_conn():
    conn = sqlite3.connect(DB_PATH)
    return conn

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/legacy')
def legacy_index():
    return render_template('index.html')

@app.route('/<path:filename>')
def serve_frontend_file(filename):
    allowed_roots = ('assets/', 'data/', 'docs/')
    allowed_files = {
        'app.js',
        'config.js',
        'styles.css',
        'manifest.json',
        'service-worker.js',
        'README.md'
    }
    if filename in allowed_files or filename.startswith(allowed_roots):
        return send_from_directory(BASE_DIR, filename)
    return jsonify({'error': 'not found'}), 404

@app.route('/next_prompt')
def next_prompt():
    # simple: return random prompt
    import random
    if not PROMPTS:
        return jsonify({'error':'no prompts available'}), 404
    p = random.choice(PROMPTS)
    return jsonify(p)

@app.route('/upload_recording', methods=['POST'])
def upload_recording():
    if 'audio' not in request.files:
        return jsonify({'error':'no audio file'}), 400
    audio = request.files['audio']
    prompt_id = request.form.get('prompt_id','')
    prompt_text = request.form.get('prompt_text','')
    user_id = request.form.get('user_id','')
    transcript = request.form.get('transcript','')

    ext = os.path.splitext(audio.filename)[1] or '.webm'
    fname = f"{datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(RECORDINGS_DIR, fname)
    audio.save(save_path)

    conn = db_conn()
    c = conn.cursor()
    c.execute('INSERT INTO recordings (prompt_id, prompt_text, filename, user_id, transcript, created_at) VALUES (?,?,?,?,?,?)',
              (prompt_id, prompt_text, fname, user_id, transcript, datetime.datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

    return jsonify({'status':'ok','filename':fname})

@app.route('/recordings/<path:filename>')
def serve_recording(filename):
    return send_from_directory(RECORDINGS_DIR, filename)

if __name__ == '__main__':
    app.run(debug=True)
