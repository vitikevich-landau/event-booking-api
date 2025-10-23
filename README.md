# 🎫 Event Booking API

Система бронирования мест на мероприятия с защитой от конкурентных запросов и дублирования бронирований.

## 🚀 Технологический стек

- **Node.js** (18+) + **TypeScript**
- **Express.js** - веб-фреймворк
- **PostgreSQL** - база данных
- **Zod** - валидация данных
- **Docker** + **Docker Compose** - контейнеризация
- **node-pg-migrate** - миграции БД

## 📋 Особенности реализации

### ✅ Защита от Race Conditions

Используется транзакция с `SELECT ... FOR UPDATE` для блокировки строки события при проверке доступных мест:

```sql
BEGIN;
SELECT * FROM events WHERE id = $1 FOR UPDATE;
-- Проверка доступных мест
INSERT INTO bookings (event_id, user_id) VALUES ($1, $2);
COMMIT;
```

### ✅ Защита от дублирования

Уникальный индекс на `(event_id, user_id)` гарантирует, что один пользователь не сможет забронировать дважды на одно событие:

```sql
CONSTRAINT unique_user_event UNIQUE (event_id, user_id)
```

### ✅ Архитектура

Чистая архитектура с разделением на слои:
- **Controllers** - HTTP handlers
- **Services** - бизнес-логика
- **Repositories** - работа с БД
- **Validators** - валидация через Zod
- **Middleware** - обработка ошибок

## 🛠️ Установка и запуск

### Вариант 1: Docker Compose (Рекомендуется)

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd event-booking-api

# 2. Скопировать .env файл
cp .env.example .env

# 3. Запустить всё одной командой
docker-compose up --build

# API будет доступно на http://localhost:3000
```

### Вариант 2: Локальный запуск

```bash
# 1. Установить зависимости
npm install

# 2. Настроить PostgreSQL и создать БД
createdb event_booking

# 3. Скопировать и настроить .env
cp .env.example .env
# Отредактировать DATABASE_URL в .env

# 4. Запустить миграции
npm run migrate:up

# 5. Запустить в development режиме
npm run dev

# Или собрать и запустить production версию
npm run build
npm start
```

## 📡 API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "database": "connected"
}
```

---

### Создать бронирование

```http
POST /api/bookings/reserve
Content-Type: application/json

{
  "event_id": 1,
  "user_id": "user123"
}
```

**Success Response (201):**
```json
{
  "id": 1,
  "event_id": 1,
  "user_id": "user123",
  "created_at": "2025-01-15T10:00:00.000Z",
  "message": "Booking created successfully"
}
```

**Error Responses:**

**400 Bad Request** - Невалидные данные:
```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [...]
}
```

**404 Not Found** - Событие не найдено:
```json
{
  "error": "NotFoundError",
  "message": "Event with id 1 not found"
}
```

**409 Conflict** - Нет мест или пользователь уже забронировал:
```json
{
  "error": "ConflictError",
  "message": "User has already booked this event"
}
```

или

```json
{
  "error": "ConflictError",
  "message": "No seats available for this event"
}
```

---

### Получить все события

```http
GET /api/events
```

**Response (200):**
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

---

### Получить событие по ID

```http
GET /api/events/:id
```

**Response (200):**
```json
{
  "id": 1,
  "name": "Tech Conference 2025",
  "total_seats": 100,
  "available_seats": 85,
  "created_at": "2025-01-15T10:00:00.000Z"
}
```

---

### Получить бронирования события

```http
GET /api/bookings/event/:eventId
```

**Response (200):**
```json
[
  {
    "id": 1,
    "event_id": 1,
    "user_id": "user123",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
]
```

---

### Получить бронирования пользователя

```http
GET /api/bookings/user/:userId
```

**Response (200):**
```json
[
  {
    "id": 1,
    "event_id": 1,
    "user_id": "user123",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
]
```

## 🧪 Примеры использования

### cURL

```bash
# Создать бронирование
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "user_id": "user123"}'

# Получить все события
curl http://localhost:3000/api/events

# Получить событие с доступными местами
curl http://localhost:3000/api/events/1
```

### HTTPie

```bash
# Создать бронирование
http POST localhost:3000/api/bookings/reserve event_id:=1 user_id=user123

# Получить все события
http GET localhost:3000/api/events
```

## 🗄️ Структура базы данных

### Таблица `events`

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный ID события |
| name | VARCHAR(255) | Название события |
| total_seats | INT | Общее количество мест |
| created_at | TIMESTAMP | Дата создания |

### Таблица `bookings`

| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL PRIMARY KEY | Уникальный ID бронирования |
| event_id | INT | ID события (FK) |
| user_id | VARCHAR(255) | ID пользователя |
| created_at | TIMESTAMP | Дата создания |

**Ограничения:**
- `UNIQUE (event_id, user_id)` - один пользователь не может забронировать дважды
- `FOREIGN KEY (event_id) REFERENCES events(id)` - каскадное удаление

## 📂 Структура проекта

```
event-booking-api/
├── src/
│   ├── config/          # Конфигурация (БД, env)
│   ├── controllers/     # HTTP handlers
│   ├── services/        # Бизнес-логика
│   ├── repositories/    # Работа с БД
│   ├── validators/      # Zod схемы
│   ├── middleware/      # Express middleware
│   ├── types/           # TypeScript типы
│   ├── utils/           # Утилиты (logger, errors)
│   ├── routes/          # API routes
│   ├── app.ts           # Express app
│   └── index.ts         # Entry point
├── migrations/          # SQL миграции
├── docker-compose.yml   # Docker Compose конфиг
├── Dockerfile          # Docker image
├── tsconfig.json       # TypeScript config
└── package.json        # Dependencies
```

## 🔧 Полезные команды

```bash
# Development
npm run dev              # Запуск с hot-reload
npm run build           # Сборка TypeScript
npm start               # Запуск production

# Миграции
npm run migrate:up      # Применить миграции
npm run migrate:down    # Откатить миграции
npm run migrate:create <name>  # Создать миграцию

# Code quality
npm run lint            # Проверка ESLint
npm run format          # Форматирование Prettier

# Docker
docker-compose up       # Запуск всех сервисов
docker-compose down     # Остановка сервисов
docker-compose logs -f  # Просмотр логов
```

## 🔐 Переменные окружения

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/event_booking
LOG_LEVEL=info
```

## 📝 Тестовые данные

При применении миграций автоматически создаются 3 тестовых события:

1. **Tech Conference 2025** - 100 мест
2. **Music Festival** - 500 мест
3. **Workshop: Node.js** - 30 мест

## 🚦 Production Ready Features

- ✅ Graceful shutdown
- ✅ Health check endpoint
- ✅ Structured logging
- ✅ Error handling middleware
- ✅ Environment validation
- ✅ Connection pooling
- ✅ Docker support
- ✅ TypeScript strict mode
- ✅ Security headers (Helmet)
- ✅ CORS support

## 📄 Лицензия

MIT

## 👨‍💻 Автор

Тестовое задание для позиции Node.js разработчика
