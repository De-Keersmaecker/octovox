-- Migration script voor 3-fasen leersysteem
-- Voegt nieuwe tabellen toe voor batterij management en fase tracking

-- Learning sessions tabel - houdt actieve leersessies bij
CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
    current_phase INTEGER NOT NULL DEFAULT 1 CHECK (current_phase IN (1, 2, 3)),
    current_battery_number INTEGER NOT NULL DEFAULT 1,
    session_state VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (session_state IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    UNIQUE(user_id, list_id) -- Een actieve sessie per gebruiker per lijst
);

-- Battery progress tabel - houdt voortgang per batterij bij
CREATE TABLE IF NOT EXISTS battery_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
    battery_number INTEGER NOT NULL,
    phase INTEGER NOT NULL CHECK (phase IN (1, 2, 3)),
    words_in_battery JSONB NOT NULL, -- Array van word_ids: ["uuid1", "uuid2", ...]
    battery_state VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (battery_state IN ('active', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    UNIQUE(session_id, battery_number, phase)
);

-- Word attempts tabel - houdt alle pogingen bij
CREATE TABLE IF NOT EXISTS word_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    phase INTEGER NOT NULL CHECK (phase IN (1, 2, 3)),
    battery_number INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    is_correct BOOLEAN NOT NULL,
    response_given TEXT, -- Wat de gebruiker heeft ingetypt/gekozen
    response_time INTEGER, -- Tijd in milliseconden
    autocorrect_applied BOOLEAN DEFAULT FALSE, -- Voor fase 3
    created_at TIMESTAMP DEFAULT NOW()
);

-- Word phase status tabel - huidige status per woord per fase
CREATE TABLE IF NOT EXISTS word_phase_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    phase INTEGER NOT NULL CHECK (phase IN (1, 2, 3)),
    status VARCHAR(20) NOT NULL DEFAULT 'unseen' CHECK (status IN ('unseen', 'green', 'orange')),
    first_attempt_correct BOOLEAN,
    total_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    needs_revision BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, word_id, phase)
);

-- Revision queue tabel - woorden die revisie nodig hebben
CREATE TABLE IF NOT EXISTS revision_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    list_id UUID REFERENCES word_lists(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('phase_issues', 'revision_failed', 'end_battery')),
    priority INTEGER DEFAULT 1, -- Hogere nummers = hogere prioriteit
    created_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP DEFAULT NOW()
);

-- Indexen voor performance
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_list ON learning_sessions(user_id, list_id);
CREATE INDEX IF NOT EXISTS idx_battery_progress_session ON battery_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_word_attempts_session_word ON word_attempts(session_id, word_id);
CREATE INDEX IF NOT EXISTS idx_word_phase_status_user_word ON word_phase_status(user_id, word_id);
CREATE INDEX IF NOT EXISTS idx_word_phase_status_user_phase ON word_phase_status(user_id, phase);
CREATE INDEX IF NOT EXISTS idx_revision_queue_user ON revision_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_queue_scheduled ON revision_queue(scheduled_for);

-- Triggers voor automatische timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learning_sessions_updated_at BEFORE UPDATE ON learning_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_word_phase_status_updated_at BEFORE UPDATE ON word_phase_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data: update bestaande student_progress als er een eenvoudiger migratie nodig is
-- Voor nu laten we de bestaande student_progress tabel intact voor backwards compatibility