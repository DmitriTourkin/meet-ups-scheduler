INSERT INTO users (email, name, timezone, password_hash) VALUES
    ('anastasia.m@example.com', 'Анастасия М.', 'Europe/Moscow', '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe'),
    ('anastasia.g@example.com', 'Анастасия Г.', 'Europe/Moscow', '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe'),
    ('dmitry.t@example.com', 'Дмитрий Т.', 'Europe/Moscow', '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe'),
    ('maria.g@example.com', 'Мария Г.', 'Europe/Moscow', '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe'),
    ('ekaterina.t@example.com', 'Екатерина Т.', 'Europe/Moscow', '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe'),
    ('polina.m@example.com', 'Полина М.', 'Europe/Moscow', '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe'),
    ('alina.zh@example.com', 'Алина Ж.', 'Europe/Moscow', '$2b$12$p9IfLvztotKYeIaFXEsQIOMmM2nANh/cGQg.o7NRepMl70ebVGVCe')
ON CONFLICT (email) DO NOTHING;

INSERT INTO friendships (user_id, friend_id)
SELECT a.id, b.id
FROM users a
CROSS JOIN users b
WHERE a.id <> b.id
  AND a.email IN (
    'anastasia.m@example.com', 'anastasia.g@example.com', 'dmitry.t@example.com',
    'maria.g@example.com', 'ekaterina.t@example.com', 'polina.m@example.com', 'alina.zh@example.com'
  )
  AND b.email IN (
    'anastasia.m@example.com', 'anastasia.g@example.com', 'dmitry.t@example.com',
    'maria.g@example.com', 'ekaterina.t@example.com', 'polina.m@example.com', 'alina.zh@example.com'
  )
ON CONFLICT (user_id, friend_id) DO NOTHING;
