-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,
  capacity INTEGER NOT NULL,
  features TEXT   NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id          INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  date             TEXT    NOT NULL,
  start_time       TEXT    NOT NULL,
  end_time         TEXT    NOT NULL,
  booker           TEXT    NOT NULL,
  purpose          TEXT,
  booking_type     TEXT    DEFAULT 'meeting',
  is_quick_booking INTEGER DEFAULT 0,
  created_at       TEXT    DEFAULT (datetime('now')),
  CHECK (start_time < end_time)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, date);

-- Seed: the 4 conference rooms
INSERT OR IGNORE INTO rooms (id, name, capacity, features) VALUES
  (1, 'Stora salen',   20, '["Projektor","Whiteboard","Videokonferens"]'),
  (2, 'Mellanrummet',   8, '["Whiteboard","TV-skärm"]'),
  (3, 'Lilla rummet',   5, '["Whiteboard"]'),
  (4, 'Båset',          2, '[]');
