ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS friendships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, friend_id)
);

DROP TABLE IF EXISTS sessions;

UPDATE users
SET password_hash = '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe'
WHERE password_hash IS NULL;

INSERT INTO friendships (user_id, friend_id)
SELECT a.id, b.id
FROM users a
CROSS JOIN users b
WHERE a.id <> b.id
ON CONFLICT (user_id, friend_id) DO NOTHING;
