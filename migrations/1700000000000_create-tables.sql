-- Create events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: один пользователь не может забронировать дважды на одно событие
    CONSTRAINT unique_user_event UNIQUE (event_id, user_id)
);

-- Index for faster queries
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Insert test events
INSERT INTO events (name, total_seats) VALUES 
    ('Tech Conference 2025', 100),
    ('Music Festival', 500),
    ('Workshop: Node.js', 30);
