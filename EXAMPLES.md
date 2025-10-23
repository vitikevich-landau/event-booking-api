# 🔥 Примеры curl команд

## Health Check

```bash
curl http://localhost:3000/health
```

## События (Events)

### Получить все события
```bash
curl http://localhost:3000/api/events
```

### Получить событие по ID
```bash
curl http://localhost:3000/api/events/1
```

## Бронирования (Bookings)

### Создать бронирование
```bash
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "user_id": "user123"
  }'
```

### Красиво отформатированный вывод (с jq)
```bash
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "user_id": "user456"}' | jq
```

### Попытка дублировать бронирование (вернет 409)
```bash
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "user_id": "user123"
  }'
```

### Получить бронирования события
```bash
curl http://localhost:3000/api/bookings/event/1
```

### Получить бронирования пользователя
```bash
curl http://localhost:3000/api/bookings/user/user123
```

## Тестирование ошибок

### Невалидные данные (400)
```bash
# Отрицательный event_id
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": -1, "user_id": "user789"}'

# Пустой user_id
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "user_id": ""}'
```

### Несуществующее событие (404)
```bash
curl http://localhost:3000/api/events/999

curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": 999, "user_id": "user123"}'
```

## Стресс-тест (конкурентные запросы)

### Проверка race conditions с помощью GNU parallel
```bash
# Установить parallel
sudo apt install parallel  # Linux
brew install parallel      # MacOS

# 10 конкурентных запросов на одно и то же событие
seq 10 | parallel -j 10 "curl -X POST http://localhost:3000/api/bookings/reserve \
  -H 'Content-Type: application/json' \
  -d '{\"event_id\": 1, \"user_id\": \"stress_user_{}\"}'"
```

### С помощью bash loop
```bash
# 5 конкурентных запросов в фоне
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/bookings/reserve \
    -H "Content-Type: application/json" \
    -d "{\"event_id\": 2, \"user_id\": \"user_$i\"}" &
done
wait
```

## Benchmark с Apache Bench

```bash
# 100 запросов, 10 конкурентных
ab -n 100 -c 10 -p booking.json -T application/json \
  http://localhost:3000/api/bookings/reserve

# booking.json:
# {"event_id": 1, "user_id": "bench_user"}
```

## Примеры успешных ответов

### GET /health
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "database": "connected"
}
```

### GET /api/events
```json
[
  {
    "id": 1,
    "name": "Tech Conference 2025",
    "total_seats": 100,
    "created_at": "2025-01-15T10:00:00.000Z"
  }
]
```

### GET /api/events/1
```json
{
  "id": 1,
  "name": "Tech Conference 2025",
  "total_seats": 100,
  "available_seats": 85,
  "created_at": "2025-01-15T10:00:00.000Z"
}
```

### POST /api/bookings/reserve (201)
```json
{
  "id": 1,
  "event_id": 1,
  "user_id": "user123",
  "created_at": "2025-01-15T10:00:00.000Z",
  "message": "Booking created successfully"
}
```

## Примеры ошибок

### 400 - Validation Error
```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "path": ["event_id"]
    }
  ]
}
```

### 404 - Not Found
```json
{
  "error": "NotFoundError",
  "message": "Event with id 999 not found"
}
```

### 409 - Conflict (Дубль)
```json
{
  "error": "ConflictError",
  "message": "User has already booked this event"
}
```

### 409 - Conflict (Нет мест)
```json
{
  "error": "ConflictError",
  "message": "No seats available for this event"
}
```
