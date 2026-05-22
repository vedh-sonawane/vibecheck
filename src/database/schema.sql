-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(20) PRIMARY KEY,
    username VARCHAR(100),
    real_name VARCHAR(200),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

-- Message metadata table (NO CONTENT STORED - privacy safe)
CREATE TABLE IF NOT EXISTS message_metadata (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    channel_id VARCHAR(20) NOT NULL,
    timestamp VARCHAR(20) NOT NULL,
    message_ts TIMESTAMP NOT NULL,
    thread_ts VARCHAR(20),
    reaction_count INTEGER DEFAULT 0,
    is_thread_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reactions metadata
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES message_metadata(id),
    user_id VARCHAR(20) REFERENCES users(user_id),
    emoji VARCHAR(100) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW()
);

-- User activity patterns (aggregated data)
CREATE TABLE IF NOT EXISTS user_patterns (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    date DATE NOT NULL,
    message_count INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER,
    late_night_messages INTEGER DEFAULT 0,
    weekend_messages INTEGER DEFAULT 0,
    emoji_sentiment_score FLOAT,
    UNIQUE(user_id, date)
);

-- Team health alerts
CREATE TABLE IF NOT EXISTS health_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    detected_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_user ON message_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_message_ts ON message_metadata(message_ts);
CREATE INDEX IF NOT EXISTS idx_patterns_user_date ON user_patterns(user_id, date);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON health_alerts(is_active, user_id);