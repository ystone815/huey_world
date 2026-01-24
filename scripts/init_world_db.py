import sqlite3
import os

# Ensure directory exists
os.makedirs('db/world', exist_ok=True)

# Create database connection
conn = sqlite3.connect('db/world/world.db')
cursor = conn.cursor()

# Create placed_objects table
# type: e.g., 'fence_wood', 'wall_stone', 'bonfire'
# x, y: grid-snapped coordinates
cursor.execute('''
CREATE TABLE IF NOT EXISTS placed_objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    owner_username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# Index for spatial lookups (though basic for now)
cursor.execute('CREATE INDEX IF NOT EXISTS idx_coords ON placed_objects(x, y)')

conn.commit()
conn.close()

print("World database initialized successfully!")
