CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE member_role AS ENUM ('editor', 'participant');
CREATE TYPE project_status AS ENUM ('pending', 'confirmed', 'cancelled', 'no_slot_found');
CREATE TYPE personal_availability_status AS ENUM ('busy', 'tentative');
CREATE TYPE project_availability_status AS ENUM ('busy', 'tentative', 'free', 'available');
CREATE TYPE notification_type AS ENUM ('slot_confirmed', 'slot_cancelled', 'slot_at_risk');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    timezone TEXT NOT NULL,
    working_hours_start TIME NOT NULL DEFAULT '09:00',
    working_hours_end TIME NOT NULL DEFAULT '18:00',
    password_hash TEXT,
    nickname TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT working_hours_valid CHECK (working_hours_start < working_hours_end)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0 AND duration_minutes % 15 = 0),
    search_range_start DATE NOT NULL,
    search_range_end DATE NOT NULL,
    status project_status NOT NULL DEFAULT 'pending',
    chosen_start_at TIMESTAMPTZ,
    chosen_end_at TIMESTAMPTZ,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT search_range_valid CHECK (search_range_start < search_range_end),
    CONSTRAINT chosen_slot_valid CHECK (
        (chosen_start_at IS NULL AND chosen_end_at IS NULL)
        OR (chosen_start_at IS NOT NULL AND chosen_end_at IS NOT NULL AND chosen_start_at < chosen_end_at)
    )
);

CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'participant',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE personal_busy_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status personal_availability_status NOT NULL DEFAULT 'busy',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT time_range_valid CHECK (start_at < end_at),
    CONSTRAINT quantized_15min CHECK (
        EXTRACT(EPOCH FROM start_at)::bigint % 900 = 0
        AND EXTRACT(EPOCH FROM end_at)::bigint % 900 = 0
    )
);
CREATE INDEX idx_personal_busy_slots_user_range ON personal_busy_slots (user_id, start_at, end_at);

CREATE TABLE project_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status project_availability_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT time_range_valid CHECK (start_at < end_at),
    CONSTRAINT quantized_15min CHECK (
        EXTRACT(EPOCH FROM start_at)::bigint % 900 = 0
        AND EXTRACT(EPOCH FROM end_at)::bigint % 900 = 0
    ),
    FOREIGN KEY (project_id, user_id) REFERENCES project_members(project_id, user_id) ON DELETE CASCADE
);
CREATE INDEX idx_project_availability_project_user ON project_availability (project_id, user_id, start_at, end_at);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE friendships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, friend_id)
);
