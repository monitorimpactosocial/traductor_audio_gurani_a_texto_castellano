import sqlite3, json, os

DB = 'data.db'
OUT = 'dataset.jsonl'

def export():
    if not os.path.exists(DB):
        print('DB not found:', DB)
        return
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute('SELECT prompt_text, filename, transcript FROM recordings')
    rows = c.fetchall()
    with open(OUT, 'w', encoding='utf-8') as f:
        for prompt_text, filename, transcript in rows:
            path = os.path.join('recordings', filename)
            obj = {'audio': path, 'text': transcript or prompt_text}
            f.write(json.dumps(obj, ensure_ascii=False) + '\n')
    conn.close()
    print('Exported', len(rows), 'rows to', OUT)

if __name__ == '__main__':
    export()
