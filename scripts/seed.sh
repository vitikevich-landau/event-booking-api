#!/bin/bash

set -e

echo "🌱 Seeding database with test data..."

DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/event_booking"}

# Insert additional test events
psql "$DATABASE_URL" << EOF
-- Additional test events
INSERT INTO events (name, total_seats) VALUES 
    ('AI Summit 2025', 200),
    ('React Conference', 150),
    ('DevOps Meetup', 50),
    ('Startup Pitch Night', 80);

-- Sample bookings
INSERT INTO bookings (event_id, user_id) VALUES 
    (1, 'alice'),
    (1, 'bob'),
    (2, 'alice'),
    (3, 'charlie');

EOF

echo "✅ Database seeded successfully!"
echo ""
echo "📊 Current state:"
psql "$DATABASE_URL" -c "SELECT e.id, e.name, e.total_seats, COUNT(b.id) as bookings FROM events e LEFT JOIN bookings b ON e.id = b.event_id GROUP BY e.id ORDER BY e.id;"
