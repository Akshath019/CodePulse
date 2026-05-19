CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS executions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id       VARCHAR(50)  NOT NULL,
    language      VARCHAR(20)  NOT NULL,
    code          TEXT         NOT NULL,
    stdout        TEXT,
    stderr        TEXT,
    exit_code     INT,
    status        VARCHAR(20)  NOT NULL,
    duration_ms   INT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_executions_room_id    ON executions(room_id);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);