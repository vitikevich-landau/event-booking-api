# 🏗️ Архитектура системы Event Booking API

## 📋 Содержание
1. [Общая архитектура](#общая-архитектура)
2. [Жизненный цикл запроса](#жизненный-цикл-запроса)
3. [Инициализация приложения](#инициализация-приложения)
4. [Структура файлов](#структура-файлов)
5. [Подключение к БД](#подключение-к-бд)
6. [Миграции](#миграции)
7. [Настройки и конфигурация](#настройки-и-конфигурация)
8. [Расширение системы](#расширение-системы)

---

## 1. Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                         КЛИЕНТ                              │
│              (Browser, Postman, curl)                       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Request
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              EVENT-BOOKING-API                       │   │
│  │              (Node.js Container)                     │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │            EXPRESS.JS APP                      │ │   │
│  │  │                                                │ │   │
│  │  │  ┌──────────────────────────────────────────┐ │ │   │
│  │  │  │         MIDDLEWARE                       │ │ │   │
│  │  │  │  • Helmet (Security)                     │ │ │   │
│  │  │  │  • CORS                                  │ │ │   │
│  │  │  │  • Body Parser                           │ │ │   │
│  │  │  │  • Logger                                │ │ │   │
│  │  │  └──────────────────────────────────────────┘ │ │   │
│  │  │                     ▼                          │ │   │
│  │  │  ┌──────────────────────────────────────────┐ │ │   │
│  │  │  │         ROUTES / CONTROLLERS             │ │ │   │
│  │  │  │  • /api/events                           │ │ │   │
│  │  │  │  • /api/bookings                         │ │ │   │
│  │  │  │  • /health                               │ │ │   │
│  │  │  └──────────────────────────────────────────┘ │ │   │
│  │  │                     ▼                          │ │   │
│  │  │  ┌──────────────────────────────────────────┐ │ │   │
│  │  │  │            SERVICES                      │ │ │   │
│  │  │  │  • bookingService                        │ │ │   │
│  │  │  │  • eventService                          │ │ │   │
│  │  │  │  (Бизнес-логика)                         │ │ │   │
│  │  │  └──────────────────────────────────────────┘ │ │   │
│  │  │                     ▼                          │ │   │
│  │  │  ┌──────────────────────────────────────────┐ │ │   │
│  │  │  │         REPOSITORIES                     │ │ │   │
│  │  │  │  • bookingRepository                     │ │ │   │
│  │  │  │  • eventRepository                       │ │ │   │
│  │  │  │  (SQL запросы + транзакции)              │ │ │   │
│  │  │  └──────────────────────────────────────────┘ │ │   │
│  │  │                     ▼                          │ │   │
│  │  │  ┌──────────────────────────────────────────┐ │ │   │
│  │  │  │        CONNECTION POOL                   │ │ │   │
│  │  │  │        (pg pool)                         │ │ │   │
│  │  │  └──────────────────────────────────────────┘ │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │ PostgreSQL Protocol               │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           EVENT-BOOKING-DB                           │   │
│  │           (PostgreSQL Container)                     │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │            DATABASE: event_booking             │ │   │
│  │  │  ┌──────────────┐    ┌──────────────┐         │ │   │
│  │  │  │ TABLE: events│    │TABLE:bookings│         │ │   │
│  │  │  │• id          │    │• id          │         │ │   │
│  │  │  │• name        │◄───┤• event_id    │         │ │   │
│  │  │  │• total_seats │    │• user_id     │         │ │   │
│  │  │  │• created_at  │    │• created_at  │         │ │   │
│  │  │  └──────────────┘    └──────────────┘         │ │   │
│  │  │                                                │ │   │
│  │  │  UNIQUE INDEX: (event_id, user_id)            │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Жизненный цикл запроса

### Пример: POST /api/bookings/reserve

```
КЛИЕНТ
  │
  │ 1. HTTP POST /api/bookings/reserve
  │    Body: {"event_id": 1, "user_id": "user123"}
  ▼
┌─────────────────────────────────────────────────────┐
│ src/index.ts                                        │
│ • Запуск HTTP сервера (Express)                     │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/app.ts                                          │
│ • app.use(helmet())        ← Security headers       │
│ • app.use(cors())          ← CORS настройки        │
│ • app.use(express.json())  ← Парсинг JSON          │
│ • app.use(logger)          ← Логирование           │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/routes/index.ts                                 │
│ • Определяет базовый путь /api                      │
│ • Подключает дочерние роуты                         │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/routes/bookingRoutes.ts                         │
│ • POST /reserve → middleware → controller           │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/middleware/validate.ts                          │
│ 2. Валидация входных данных через Zod               │
│    • Проверка типов                                 │
│    • Проверка ограничений (event_id > 0)            │
│    • Если ошибка → next(error) → errorHandler       │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/controllers/bookingController.ts                │
│ 3. BookingController.createBooking()                │
│    • Извлекает event_id и user_id из req.body       │
│    • Вызывает bookingService.createBooking()        │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/services/bookingService.ts                      │
│ 4. BookingService.createBooking()                   │
│    • Проверяет существование события через          │
│      eventRepository.getEventById()                 │
│    • Вызывает bookingRepository.createBooking()     │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/repositories/bookingRepository.ts               │
│ 5. BookingRepository.createBooking()                │
│    • const client = await pool.connect()            │
│    • BEGIN TRANSACTION                              │
│    • SELECT * FROM events WHERE id=$1 FOR UPDATE    │
│    • Проверка доступных мест                        │
│    • INSERT INTO bookings (event_id, user_id)       │
│    • COMMIT                                         │
│    • client.release()                               │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ src/config/database.ts                              │
│ 6. Connection Pool                                  │
│    • Берёт соединение из пула                       │
│    • Выполняет SQL запрос                           │
│    • Возвращает результат                           │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│ PostgreSQL Database                                 │
│ 7. Выполнение SQL на уровне БД                      │
│    • Блокировка строки (FOR UPDATE)                 │
│    • Проверка UNIQUE constraint                     │
│    • Вставка данных                                 │
│    • Возврат результата                             │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ 8. Результат возвращается обратно
                      │    Repository → Service → Controller
                      ▼
┌─────────────────────────────────────────────────────┐
│ Controller отправляет ответ                         │
│ res.status(201).json({                              │
│   id, event_id, user_id, created_at,                │
│   message: "Booking created successfully"           │
│ })                                                  │
└─────────────────────┬───────────────────────────────┘
                      ▼
                   КЛИЕНТ
            Получает JSON ответ
```

### Обработка ошибок

```
Ошибка на любом уровне
        │
        ▼
   next(error)
        │
        ▼
┌─────────────────────────────────┐
│ src/middleware/errorHandler.ts  │
│ • Логирует ошибку               │
│ • Определяет тип ошибки:        │
│   - ZodError → 400              │
│   - NotFoundError → 404         │
│   - ConflictError → 409         │
│   - AppError → statusCode       │
│   - Unknown → 500               │
│ • Формирует JSON ответ          │
└─────────────────┬───────────────┘
                  ▼
           Клиент получает
           { error, message }
```

---

## 3. Инициализация приложения

### Последовательность запуска

```
1. DOCKER-COMPOSE UP
   │
   ├─► Запуск PostgreSQL контейнера
   │   └─► Healthcheck: pg_isready
   │       └─► Ждёт пока БД готова
   │
   └─► Запуск API контейнера (depends_on postgres)
       │
       └─► Выполнение Dockerfile
           │
           ├─► npm ci (установка зависимостей)
           ├─► npm run build (компиляция TypeScript)
           └─► npm start (запуск приложения)
               │
               └─► node dist/index.js
                   │
                   ▼

2. src/index.ts - ENTRY POINT
   │
   ├─► import app from './app'
   ├─► import env from './config/env'
   ├─► import pool from './config/database'
   │
   ├─► app.listen(PORT)
   │   └─► HTTP сервер запущен на порту 3000
   │
   ├─► Регистрация обработчиков сигналов:
   │   ├─► process.on('SIGTERM', gracefulShutdown)
   │   ├─► process.on('SIGINT', gracefulShutdown)
   │   ├─► process.on('unhandledRejection')
   │   └─► process.on('uncaughtException')
   │
   └─► Logger: "Server is running on port 3000"

3. src/app.ts - EXPRESS APP SETUP
   │
   ├─► const app = express()
   │
   ├─► Подключение middleware (по порядку):
   │   ├─► helmet() - Security headers
   │   ├─► cors() - CORS настройки
   │   ├─► express.json() - Парсинг JSON
   │   ├─► express.urlencoded() - Парсинг form data
   │   └─► Custom logger middleware
   │
   ├─► Регистрация routes:
   │   ├─► GET /health
   │   └─► app.use('/api', routes)
   │       ├─► /api/events
   │       └─► /api/bookings
   │
   └─► Обработчики ошибок:
       ├─► notFoundHandler (404)
       └─► errorHandler (все остальные)

4. src/config/env.ts - ВАЛИДАЦИЯ ОКРУЖЕНИЯ
   │
   ├─► dotenv.config() - Загрузка .env файла
   │
   ├─► envSchema.parse(process.env)
   │   └─► Zod проверяет:
   │       ├─► NODE_ENV (development/production)
   │       ├─► PORT (число > 0)
   │       ├─► DATABASE_URL (валидный URL)
   │       └─► LOG_LEVEL (error/warn/info/debug)
   │
   └─► Если ошибка → process.exit(1)

5. src/config/database.ts - CONNECTION POOL
   │
   ├─► new Pool({
   │     connectionString: env.DATABASE_URL,
   │     max: 20,  ← Максимум соединений
   │     idleTimeoutMillis: 30000,
   │     connectionTimeoutMillis: 2000
   │   })
   │
   ├─► pool.on('error') - Обработчик ошибок
   │
   └─► Pool готов к использованию

6. ПРИЛОЖЕНИЕ ГОТОВО
   └─► Ожидает входящие HTTP запросы
```

---

## 4. Структура файлов

```
event-booking-api/
│
├── 📁 src/                          # Исходный код
│   │
│   ├── 📄 index.ts                  # ENTRY POINT
│   │   └─► Запуск HTTP сервера
│   │   └─► Graceful shutdown
│   │
│   ├── 📄 app.ts                    # EXPRESS APP
│   │   └─► Настройка middleware
│   │   └─► Регистрация routes
│   │   └─► Error handlers
│   │
│   ├── 📁 config/                   # КОНФИГУРАЦИЯ
│   │   ├── 📄 env.ts               # Переменные окружения
│   │   │   └─► Валидация через Zod
│   │   │   └─► PORT, DATABASE_URL, NODE_ENV
│   │   │
│   │   └── 📄 database.ts          # Подключение к БД
│   │       └─► Connection Pool (pg)
│   │       └─► Error handling
│   │
│   ├── 📁 routes/                   # МАРШРУТЫ
│   │   ├── 📄 index.ts             # Главный роутер
│   │   │   └─► /api → подроуты
│   │   │
│   │   ├── 📄 bookingRoutes.ts     # /api/bookings/*
│   │   │   ├─► POST /reserve
│   │   │   ├─► GET /event/:eventId
│   │   │   └─► GET /user/:userId
│   │   │
│   │   └── 📄 eventRoutes.ts       # /api/events/*
│   │       ├─► GET /
│   │       └─► GET /:id
│   │
│   ├── 📁 controllers/              # HTTP HANDLERS
│   │   ├── 📄 bookingController.ts
│   │   │   └─► Обрабатывает req/res
│   │   │   └─► Вызывает services
│   │   │   └─► Возвращает JSON
│   │   │
│   │   └── 📄 eventController.ts
│   │       └─► Аналогично
│   │
│   ├── 📁 services/                 # БИЗНЕС-ЛОГИКА
│   │   ├── 📄 bookingService.ts
│   │   │   └─► Координирует repositories
│   │   │   └─► Проверки перед созданием
│   │   │   └─► Не знает об HTTP
│   │   │
│   │   └── 📄 eventService.ts
│   │       └─► Аналогично
│   │
│   ├── 📁 repositories/             # DATA ACCESS LAYER
│   │   ├── 📄 bookingRepository.ts
│   │   │   └─► SQL запросы
│   │   │   └─► Транзакции
│   │   │   └─► CRUD операции
│   │   │
│   │   └── 📄 eventRepository.ts
│   │       └─► SQL запросы
│   │       └─► Чтение событий
│   │
│   ├── 📁 middleware/               # EXPRESS MIDDLEWARE
│   │   ├── 📄 validate.ts          # Zod валидация
│   │   │   └─► validateBody(schema)
│   │   │
│   │   └── 📄 errorHandler.ts      # Обработка ошибок
│   │       ├─► errorHandler()
│   │       └─► notFoundHandler()
│   │
│   ├── 📁 validators/               # ZOD СХЕМЫ
│   │   └── 📄 index.ts
│   │       ├─► createBookingSchema
│   │       └─► envSchema
│   │
│   ├── 📁 types/                    # TYPESCRIPT ТИПЫ
│   │   └── 📄 index.ts
│   │       ├─► Event
│   │       ├─► Booking
│   │       ├─► BookingResponse
│   │       └─► ErrorResponse
│   │
│   └── 📁 utils/                    # УТИЛИТЫ
│       ├── 📄 logger.ts             # Логирование
│       │   └─► JSON structured logs
│       │
│       └── 📄 errors.ts             # Custom Error классы
│           ├─► AppError
│           ├─► NotFoundError
│           ├─► ConflictError
│           └─► BadRequestError
│
├── 📁 migrations/                   # SQL МИГРАЦИИ
│   └── 📄 1700000000000_create-tables.sql
│       ├─► CREATE TABLE events
│       ├─► CREATE TABLE bookings
│       ├─► CREATE UNIQUE INDEX
│       └─► INSERT test data
│
├── 📁 scripts/                      # BASH СКРИПТЫ
│   ├── 📄 check-env.sh             # Проверка окружения
│   └── 📄 seed.sh                  # Добавление данных
│
├── 📄 .env                          # ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
│   ├─► NODE_ENV=development
│   ├─► PORT=3000
│   ├─► DATABASE_URL=postgresql://...
│   └─► LOG_LEVEL=info
│
├── 📄 docker-compose.yml            # DOCKER ORCHESTRATION
│   ├─► Сервис: postgres
│   └─► Сервис: api
│
├── 📄 Dockerfile                    # DOCKER IMAGE
│   ├─► FROM node:18-alpine
│   ├─► npm ci
│   ├─► npm run build
│   └─► npm start
│
├── 📄 package.json                  # NPM DEPENDENCIES
│   ├─► express, pg, zod, helmet...
│   └─► Scripts: dev, build, start
│
└── 📄 tsconfig.json                 # TYPESCRIPT CONFIG
    └─► strict mode, ES2022, commonjs
```

---

## 5. Подключение к БД

### Схема подключения

```
┌─────────────────────────────────────────────┐
│ .env файл                                   │
│ DATABASE_URL=postgresql://                  │
│   postgres:postgres@                        │
│   localhost:5432/                           │
│   event_booking                             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ src/config/env.ts                           │
│ • Загружает .env через dotenv               │
│ • Валидирует через Zod:                     │
│   envSchema.parse(process.env)              │
│ • Проверяет что DATABASE_URL валидный URL   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ src/config/database.ts                      │
│                                             │
│ const pool = new Pool({                     │
│   connectionString: env.DATABASE_URL,       │
│   max: 20,           ← макс соединений      │
│   idleTimeoutMillis: 30000,                 │
│   connectionTimeoutMillis: 2000             │
│ });                                         │
│                                             │
│ pool.on('error', (err) => {                 │
│   console.error('DB error', err);           │
│   process.exit(-1);                         │
│ });                                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ CONNECTION POOL                             │
│                                             │
│  [Conn1] [Conn2] [Conn3] ... [Conn20]      │
│    ↓       ↓       ↓           ↓           │
│  idle    busy    idle        idle          │
│                                             │
│ Автоматически управляется:                  │
│ • Создаёт соединения по требованию          │
│ • Переиспользует освободившиеся             │
│ • Закрывает неактивные через 30 сек         │
│ • Максимум 20 одновременных соединений      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Использование в Repository                  │
│                                             │
│ // Простой запрос (автоматический клиент)  │
│ const result = await pool.query(           │
│   'SELECT * FROM events'                    │
│ );                                          │
│                                             │
│ // Транзакция (ручной клиент)              │
│ const client = await pool.connect();       │
│ try {                                       │
│   await client.query('BEGIN');             │
│   // SQL запросы                            │
│   await client.query('COMMIT');            │
│ } finally {                                 │
│   client.release(); ← ОБЯЗАТЕЛЬНО!         │
│ }                                           │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ PostgreSQL Database                         │
│ Host: localhost (или postgres в Docker)     │
│ Port: 5432                                  │
│ Database: event_booking                     │
│ User: postgres                              │
│ Password: postgres                          │
└─────────────────────────────────────────────┘
```

### Connection Pool - как работает

```
ЗАПРОС 1:                    ЗАПРОС 2:
   │                            │
   ▼                            ▼
pool.query()                pool.query()
   │                            │
   ├─► Берёт Conn1              ├─► Берёт Conn2
   │   из пула                  │   из пула
   │                            │
   ├─► Выполняет SQL            ├─► Выполняет SQL
   │                            │
   └─► Возвращает Conn1         └─► Возвращает Conn2
       в пул                        в пул

ПАРАЛЛЕЛЬНО 25 ЗАПРОСОВ:
   ├─► 20 берут соединения из пула (max: 20)
   └─► 5 ждут в очереди пока освободится соединение
```

---

## 6. Миграции

### Как работают миграции

```
┌─────────────────────────────────────────────┐
│ 1. Создание миграции                        │
│                                             │
│ $ npm run migrate:create add-new-table      │
│                                             │
│ Создаёт файл:                               │
│ migrations/1700123456789_add-new-table.sql  │
│           └─────┬─────┘                     │
│              timestamp                      │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 2. Написание SQL                            │
│                                             │
│ -- UP: применение миграции                  │
│ CREATE TABLE new_table (...);               │
│                                             │
│ -- DOWN: откат миграции                     │
│ DROP TABLE new_table;                       │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 3. Применение миграции                      │
│                                             │
│ $ npm run migrate:up                        │
│                                             │
│ node-pg-migrate читает:                     │
│ ├─► .pgmigraterc (настройки)               │
│ ├─► DATABASE_URL из env                     │
│ └─► migrations/*.sql (по порядку)           │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 4. Выполнение в БД                          │
│                                             │
│ PostgreSQL выполняет SQL:                   │
│ ├─► Создаёт таблицу pgmigrations            │
│ │   (история миграций)                      │
│ │                                           │
│ ├─► Проверяет какие уже применены           │
│ │                                           │
│ ├─► Применяет новые миграции                │
│ │   в транзакции                            │
│ │                                           │
│ └─► Записывает в pgmigrations               │
│     что миграция выполнена                  │
└──────────────┬──────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│ 5. Результат                                │
│                                             │
│ Таблицы созданы и готовы к использованию!   │
└─────────────────────────────────────────────┘
```

### Структура миграции

```sql
-- migrations/1700000000000_create-tables.sql

-- ===== UP: Применение =====
-- Создание таблицы events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы bookings
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Защита от дублей
    CONSTRAINT unique_user_event UNIQUE (event_id, user_id)
);

-- Индексы для производительности
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Тестовые данные
INSERT INTO events (name, total_seats) VALUES 
    ('Tech Conference 2025', 100),
    ('Music Festival', 500),
    ('Workshop: Node.js', 30);
```

### Откат миграции

```bash
# Откатить последнюю миграцию
$ npm run migrate:down

# Откатить 3 миграции
$ npm run migrate:down 3
```

### Таблица pgmigrations

```sql
SELECT * FROM pgmigrations;

 id |        name                        |     run_on
----+------------------------------------+------------------
  1 | 1700000000000_create-tables.sql   | 2025-10-23 10:00
  2 | 1700000000001_add-users.sql       | 2025-10-23 11:00
```

---

## 7. Настройки и конфигурация

### Где хранятся настройки

```
┌─────────────────────────────────────────────────────┐
│ 1. .env - ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (ГЛАВНЫЙ ФАЙЛ)       │
│                                                     │
│ NODE_ENV=development                                │
│ PORT=3000                                           │
│ DATABASE_URL=postgresql://postgres:postgres@        │
│              localhost:5432/event_booking           │
│ LOG_LEVEL=info                                      │
│                                                     │
│ ❗ НЕ коммитится в Git (.gitignore)                 │
│ ❗ Каждый разработчик имеет свой .env               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 2. .env.example - ШАБЛОН                            │
│                                                     │
│ Коммитится в Git                                    │
│ Показывает какие переменные нужны                   │
│ Без реальных паролей                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 3. docker-compose.yml - DOCKER НАСТРОЙКИ            │
│                                                     │
│ environment:                                        │
│   NODE_ENV: production                              │
│   DATABASE_URL: postgresql://postgres:postgres@     │
│                postgres:5432/event_booking          │
│   PORT: 3000                                        │
│                                                     │
│ ❗ Переопределяет .env для Docker                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 4. tsconfig.json - TYPESCRIPT НАСТРОЙКИ             │
│                                                     │
│ {                                                   │
│   "strict": true,                                   │
│   "target": "ES2022",                               │
│   "module": "commonjs",                             │
│   ...                                               │
│ }                                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 5. package.json - NPM НАСТРОЙКИ                     │
│                                                     │
│ • Зависимости (dependencies)                        │
│ • Скрипты (scripts)                                 │
│ • Версия Node.js (engines)                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 6. .pgmigraterc - МИГРАЦИИ НАСТРОЙКИ                │
│                                                     │
│ {                                                   │
│   "migrations-dir": "migrations",                   │
│   "database-url-var": "DATABASE_URL",               │
│   "migration-file-language": "sql"                  │
│ }                                                   │
└─────────────────────────────────────────────────────┘
```

### Как настройки загружаются

```
СТАРТ ПРИЛОЖЕНИЯ
    │
    ▼
┌──────────────────────────────────┐
│ import env from './config/env'   │
└──────────────┬───────────────────┘
               ▼
┌──────────────────────────────────┐
│ src/config/env.ts                │
│                                  │
│ 1. dotenv.config()               │
│    └─► Читает .env файл          │
│    └─► Загружает в process.env   │
│                                  │
│ 2. envSchema.parse(process.env)  │
│    └─► Валидирует через Zod      │
│    └─► Конвертирует типы         │
│    └─► Если ошибка → EXIT(1)     │
│                                  │
│ 3. export envConfig              │
└──────────────┬───────────────────┘
               ▼
┌──────────────────────────────────┐
│ Использование в коде             │
│                                  │
│ import env from './config/env'   │
│                                  │
│ const PORT = env.PORT            │
│ const DB = env.DATABASE_URL      │
│ const LEVEL = env.LOG_LEVEL      │
│                                  │
│ ✅ Типобезопасно!                │
│ ✅ Валидировано!                 │
└──────────────────────────────────┘
```

---

## 8. Расширение системы

### Пример: Добавление JWT авторизации

#### Шаг 1: Добавить зависимости

```bash
npm install jsonwebtoken bcrypt
npm install --save-dev @types/jsonwebtoken @types/bcrypt
```

#### Шаг 2: Обновить .env

```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

#### Шаг 3: Обновить Zod схему

```typescript
// src/validators/index.ts
export const envSchema = z.object({
  // ... существующие
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
});
```

#### Шаг 4: Создать миграцию для users

```sql
-- migrations/1700000000002_add-users.sql

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Обновить bookings
ALTER TABLE bookings 
ADD COLUMN user_table_id INT REFERENCES users(id);
```

#### Шаг 5: Создать AuthService

```typescript
// src/services/authService.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import env from '../config/env';

export class AuthService {
  async register(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);
    // Сохранить в БД через userRepository
    const user = await userRepository.create(email, hash);
    return this.generateToken(user.id);
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError();
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError();
    
    return this.generateToken(user.id);
  }

  private generateToken(userId: number) {
    return jwt.sign(
      { userId },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  verifyToken(token: string) {
    return jwt.verify(token, env.JWT_SECRET);
  }
}
```

#### Шаг 6: Создать Auth middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';

// Расширяем Request тип
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = authService.verifyToken(token) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Проверка ролей
export const authorize = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await userRepository.findById(req.userId!);
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
```

#### Шаг 7: Защитить роуты

```typescript
// src/routes/bookingRoutes.ts
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Публичные роуты
router.get('/event/:eventId', bookingController.getBookingsByEventId);

// Защищённые роуты
router.post(
  '/reserve',
  authenticate,  // ← Требует JWT токен
  validateBody(createBookingSchema),
  bookingController.createBooking
);

// Только для админов
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),  // ← Только админы
  bookingController.deleteBooking
);
```

#### Шаг 8: Добавить Auth routes

```typescript
// src/routes/authRoutes.ts
import { Router } from 'express';
import authController from '../controllers/authController';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
```

#### Шаг 9: Обновить главный роутер

```typescript
// src/routes/index.ts
import authRoutes from './authRoutes';

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/events', eventRoutes);
```

### Схема с авторизацией

```
КЛИЕНТ
  │
  │ 1. POST /api/auth/register
  │    Body: {email, password}
  ▼
AuthController
  │
  ▼
AuthService.register()
  ├─► bcrypt.hash(password)
  ├─► userRepository.create()
  └─► jwt.sign({userId})
  │
  ▼
Возврат: { token: "eyJhbGc..." }

───────────────────────────────────

КЛИЕНТ сохраняет token
  │
  │ 2. POST /api/bookings/reserve
  │    Headers: Authorization: Bearer <token>
  │    Body: {event_id, user_id}
  ▼
authenticate middleware
  ├─► Извлекает token из headers
  ├─► jwt.verify(token, JWT_SECRET)
  ├─► req.userId = decoded.userId
  │
  ▼ Token валиден
  │
bookingController.createBooking()
  └─► Использует req.userId
```

### Другие расширения

```
┌─────────────────────────────────────────────────────┐
│ РАСШИРЕНИЯ СИСТЕМЫ                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1. Rate Limiting                                    │
│    └─► npm install express-rate-limit               │
│    └─► Ограничение запросов на IP                  │
│                                                     │
│ 2. Redis Caching                                    │
│    └─► npm install redis                            │
│    └─► Кеширование списка событий                  │
│                                                     │
│ 3. WebSockets для real-time                         │
│    └─► npm install socket.io                        │
│    └─► Обновление доступных мест в реальном времени │
│                                                     │
│ 4. Email уведомления                                │
│    └─► npm install nodemailer                       │
│    └─► Отправка подтверждений бронирования         │
│                                                     │
│ 5. Pagination & Filtering                           │
│    └─► Query parameters: ?page=1&limit=10           │
│    └─► Repositories поддерживают offset/limit       │
│                                                     │
│ 6. API Documentation                                │
│    └─► npm install swagger-jsdoc swagger-ui-express │
│    └─► Автогенерация OpenAPI docs                   │
│                                                     │
│ 7. Testing                                          │
│    └─► npm install jest supertest                   │
│    └─► Unit tests + Integration tests               │
│                                                     │
│ 8. Мониторинг                                       │
│    └─► npm install prom-client                      │
│    └─► Prometheus metrics endpoint                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Резюме

**Основные принципы архитектуры:**

1. **Separation of Concerns** - каждый слой отвечает за своё
2. **Dependency Injection** - зависимости передаются, а не создаются
3. **Single Responsibility** - один класс = одна ответственность
4. **Type Safety** - TypeScript + Zod для runtime валидации
5. **Error Handling** - централизованная обработка ошибок
6. **Transaction Management** - для критичных операций
7. **Connection Pooling** - эффективное использование БД
8. **Environment Validation** - валидация настроек при старте
9. **Graceful Shutdown** - корректное завершение работы
10. **Extensibility** - легко добавлять новые фичи

**Система готова к:**
- ✅ Production deployment
- ✅ Горизонтальному масштабированию
- ✅ Добавлению новых фич
- ✅ Интеграции с другими сервисами
- ✅ Мониторингу и логированию
