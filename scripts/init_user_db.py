import sqlite3
from datetime import datetime

# Create database connection
conn = sqlite3.connect('db/user/users.db')
cursor = conn.cursor()

# Create users table
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    skin TEXT DEFAULT 'skin_fox',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
)
''')

# Create sessions table for auto-login tokens
cursor.execute('''
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
''')

# Create inventory table
cursor.execute('''
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    slot_index INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
''')

# Create leaderboard table
cursor.execute('''
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
''')

# Create index for faster lookups
cursor.execute('CREATE INDEX IF NOT EXISTS idx_username ON users(username)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_token ON sessions(token)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions ON sessions(user_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_inventory ON inventory(user_id)')

conn.commit()
conn.close()

print("Database created successfully!")
print("Tables: users, sessions")
