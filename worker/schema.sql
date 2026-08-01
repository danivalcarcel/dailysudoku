CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  nickname TEXT UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE progress (
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  board TEXT NOT NULL,
  notes TEXT NOT NULL,
  completed_units TEXT NOT NULL,
  scored INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL,
  mistakes INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date, difficulty)
);

CREATE TABLE history (
  user_id INTEGER NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  points INTEGER NOT NULL,
  times TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);
