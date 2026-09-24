INSERT INTO users (email, name, timezone) VALUES
    ('anastasia.m@example.com', 'Анастасия М.', 'Europe/Moscow'),
    ('anastasia.g@example.com', 'Анастасия Г.', 'Europe/Moscow'),
    ('dmitry.t@example.com', 'Дмитрий Т.', 'Europe/Moscow'),
    ('maria.g@example.com', 'Мария Г.', 'Europe/Moscow'),
    ('ekaterina.t@example.com', 'Екатерина Т.', 'Europe/Moscow'),
    ('polina.m@example.com', 'Полина М.', 'Europe/Moscow'),
    ('alina.zh@example.com', 'Алина Ж.', 'Europe/Moscow')
ON CONFLICT (email) DO NOTHING;
