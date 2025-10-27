# 🚀 План миграции на NestJS

## 📋 Вопросы для согласования

Перед началом миграции нужно принять несколько важных решений:

### 1. 🗄️ Подход к работе с базой данных

**Варианты:**

**A) TypeORM** (рекомендуется NestJS)
- ✅ Официальная интеграция с NestJS
- ✅ Декораторы для entities
- ✅ Migrations встроены
- ✅ Поддержка транзакций с `@Transaction`
- ❌ Более тяжеловесный
- ❌ Требует переписать все SQL запросы

**B) Prisma** (современный подход)
- ✅ Type-safe из коробки
- ✅ Отличная интеграция с TypeScript
- ✅ Prisma Studio для визуализации данных
- ✅ Автогенерация типов
- ❌ Требует изучения Prisma schema
- ❌ Требует переписать все SQL запросы

**C) Продолжить с pg + raw SQL** (минимальные изменения)
- ✅ Сохраняем все текущие SQL запросы
- ✅ Сохраняем транзакции как есть (SELECT FOR UPDATE)
- ✅ Минимум изменений в репозиториях
- ✅ Быстрее всего мигрировать
- ❌ Нет автоматической генерации типов
- ❌ Менее "NestJS way"

**МОЯ РЕКОМЕНДАЦИЯ: Вариант C (pg + raw SQL)**
- Быстрее всего мигрировать
- Сохраняем проверенную логику с транзакциями
- Можем позже перейти на ORM если потребуется

### 2. 🔧 Валидация

**Варианты:**

**A) class-validator + class-transformer** (NestJS стандарт)
- ✅ Декораторы для валидации
- ✅ Автоматическая трансформация типов
- ✅ Встроенная интеграция с NestJS
- ❌ Нужно переписать Zod схемы

**B) Продолжить с Zod**
- ✅ Сохраняем текущие схемы
- ✅ Type inference работает
- ❌ Нужен custom pipe для интеграции

**МОЯ РЕКОМЕНДАЦИЯ: Вариант A (class-validator)**
- Это NestJS way
- Лучше интегрируется с Swagger
- Проще для команды в будущем

### 3. 📁 Структура проекта

**Варианты:**

**A) Monorepo структура** (modules в src/)
```
src/
├── events/
├── bookings/
├── common/
├── config/
└── database/
```

**B) Модульная структура** (modules в отдельной папке)
```
src/
├── modules/
│   ├── events/
│   └── bookings/
├── common/
├── config/
└── database/
```

**МОЯ РЕКОМЕНДАЦИЯ: Вариант A (modules в src/)**
- Проще и чище
- Стандарт для NestJS проектов

### 4. 🔄 Подход к миграции

**Варианты:**

**A) Постепенная миграция** (оба сервера работают параллельно)
- Создаём NestJS в отдельной папке
- Старый Express продолжает работать
- Переключаемся после полной готовности

**B) Прямая миграция** (переписываем в той же папке)
- Переписываем проект на месте
- Коммитим по мере готовности модулей
- Быстрее, но более рискованно

**МОЯ РЕКОМЕНДАЦИЯ: Вариант B (прямая миграция)**
- Мы в feature branch, безопасно
- Проще отслеживать изменения
- Меньше дублирования кода

---

## 📊 Детальный план миграции

### PHASE 1: Подготовка ✅
**Время: 30 минут**

**Задачи:**
1. ✅ Установить NestJS dependencies
2. ✅ Установить необходимые пакеты (validation, config, etc.)
3. ✅ Создать базовую структуру папок
4. ✅ Настроить tsconfig для NestJS

**Зависимости:**
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@nestjs/config": "^3.0.0",
  "class-validator": "^0.14.0",
  "class-transformer": "^0.5.1",
  "reflect-metadata": "^0.1.13",
  "rxjs": "^7.8.1"
}
```

---

### PHASE 2: Базовая структура
**Время: 1 час**

**Задачи:**
1. ✅ Создать main.ts (entry point)
2. ✅ Создать app.module.ts (root module)
3. ✅ Создать app.controller.ts (health check)
4. ✅ Создать базовые папки модулей

**Структура:**
```
src/
├── main.ts                    # Bootstrap application
├── app.module.ts              # Root module
├── app.controller.ts          # Health check endpoint
├── config/                    # Configuration module
│   ├── config.module.ts
│   ├── env.config.ts
│   └── database.config.ts
├── database/                  # Database module
│   ├── database.module.ts
│   └── database.provider.ts
├── events/                    # Events module
│   └── (будет создано в Phase 3)
├── bookings/                  # Bookings module
│   └── (будет создано в Phase 4)
└── common/                    # Shared resources
    ├── filters/
    ├── pipes/
    ├── guards/
    └── interceptors/
```

---

### PHASE 3: Database и Configuration
**Время: 1 час**

**Задачи:**
1. ✅ Мигрировать env.ts → ConfigModule
2. ✅ Создать database.module.ts
3. ✅ Настроить Pool provider для pg
4. ✅ Проверить подключение к БД

**Компоненты:**
- `ConfigModule` с валидацией через Joi
- `DatabaseModule` с Pool provider
- Environment validation

---

### PHASE 4: Events Module
**Время: 2-3 часа**

**Задачи:**
1. ✅ Создать events.module.ts
2. ✅ Создать DTOs (CreateEventDto, EventResponseDto)
3. ✅ Мигрировать EventRepository
4. ✅ Мигрировать EventService
5. ✅ Мигрировать EventController
6. ✅ Добавить валидацию
7. ✅ Протестировать эндпоинты

**Компоненты:**
```
src/events/
├── events.module.ts
├── events.controller.ts
├── events.service.ts
├── events.repository.ts
├── dto/
│   ├── create-event.dto.ts
│   └── event-response.dto.ts
├── entities/
│   └── event.entity.ts        # TypeScript interface
└── events.controller.spec.ts  # Tests
```

**API endpoints:**
- `GET /api/events` → Все события
- `GET /api/events/:id` → Событие с доступными местами

---

### PHASE 5: Bookings Module
**Время: 2-3 часа**

**Задачи:**
1. ✅ Создать bookings.module.ts
2. ✅ Создать DTOs (CreateBookingDto, BookingResponseDto)
3. ✅ Мигрировать BookingRepository с транзакциями
4. ✅ Мигрировать BookingService
5. ✅ Мигрировать BookingController
6. ✅ Добавить валидацию
7. ✅ Протестировать race conditions
8. ✅ Протестировать дублирование

**Компоненты:**
```
src/bookings/
├── bookings.module.ts
├── bookings.controller.ts
├── bookings.service.ts
├── bookings.repository.ts
├── dto/
│   ├── create-booking.dto.ts
│   └── booking-response.dto.ts
├── entities/
│   └── booking.entity.ts
└── bookings.controller.spec.ts
```

**API endpoints:**
- `POST /api/bookings/reserve` → Создать бронирование
- `GET /api/bookings/event/:eventId` → Бронирования события
- `GET /api/bookings/user/:userId` → Бронирования пользователя

**ВАЖНО:** Сохранить защиту от race conditions:
```typescript
// Транзакция с SELECT FOR UPDATE
const client = await this.pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
  // ... проверки и INSERT
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

### PHASE 6: Common (Middleware, Guards, Filters)
**Время: 1-2 часа**

**Задачи:**
1. ✅ Создать Exception Filter (errorHandler)
2. ✅ Создать Logging Interceptor
3. ✅ Создать Validation Pipe
4. ✅ Мигрировать custom errors
5. ✅ Мигрировать logger

**Компоненты:**
```
src/common/
├── filters/
│   └── http-exception.filter.ts
├── interceptors/
│   └── logging.interceptor.ts
├── pipes/
│   └── validation.pipe.ts
├── exceptions/
│   ├── not-found.exception.ts
│   └── conflict.exception.ts
└── logger/
    └── custom-logger.service.ts
```

---

### PHASE 7: Финальная настройка
**Время: 1-2 часа**

**Задачи:**
1. ✅ Настроить Helmet
2. ✅ Настроить CORS
3. ✅ Настроить Graceful Shutdown
4. ✅ Обновить package.json scripts
5. ✅ Обновить Dockerfile
6. ✅ Обновить docker-compose.yml
7. ✅ Добавить Swagger документацию (опционально)

**main.ts настройки:**
- Global validation pipe
- Global exception filter
- Helmet middleware
- CORS
- Shutdown hooks

---

### PHASE 8: Тестирование
**Время: 1-2 часа**

**Задачи:**
1. ✅ Протестировать все API endpoints
2. ✅ Протестировать race conditions (параллельные запросы)
3. ✅ Протестировать дублирование (UNIQUE constraint)
4. ✅ Протестировать health check
5. ✅ Проверить логирование
6. ✅ Проверить обработку ошибок
7. ✅ Запустить в Docker

**Тест кейсы:**
```bash
# Health check
curl http://localhost:3000/health

# Получить все события
curl http://localhost:3000/api/events

# Получить событие с доступными местами
curl http://localhost:3000/api/events/1

# Создать бронирование
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "user_id": "user123"}'

# Попытка дублирования (должна вернуть 409)
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "user_id": "user123"}'

# Бронирования события
curl http://localhost:3000/api/bookings/event/1

# Бронирования пользователя
curl http://localhost:3000/api/bookings/user/user123
```

---

### PHASE 9: Cleanup и документация
**Время: 30 минут**

**Задачи:**
1. ✅ Удалить старые Express файлы
2. ✅ Обновить README.md
3. ✅ Обновить CONTRIBUTING.md (если есть)
4. ✅ Создать CHANGELOG.md запись
5. ✅ Финальный коммит

---

## ⏱️ Общее время миграции

**Оптимистичная оценка:** 8-10 часов
**Реалистичная оценка:** 12-14 часов (с тестированием и отладкой)

---

## 🔄 Порядок выполнения

1. ✅ **Согласовать решения** (База данных, валидация, структура)
2. ✅ **Phase 1-2:** Подготовка и базовая структура (1.5 часа)
3. ✅ **Phase 3:** Database и Config (1 час)
4. ✅ **Phase 4:** Events Module (2-3 часа)
5. ✅ **Phase 5:** Bookings Module (2-3 часа)
6. ✅ **Phase 6:** Common (1-2 часа)
7. ✅ **Phase 7:** Финальная настройка (1-2 часа)
8. ✅ **Phase 8:** Тестирование (1-2 часа)
9. ✅ **Phase 9:** Cleanup (30 минут)

---

## 🎯 Критерии успешной миграции

### Функциональные требования:
- ✅ Все API endpoints работают идентично
- ✅ Защита от race conditions сохранена
- ✅ Защита от дублирования работает
- ✅ Health check endpoint работает
- ✅ Graceful shutdown работает

### Нефункциональные требования:
- ✅ Код следует NestJS best practices
- ✅ TypeScript типы везде
- ✅ Валидация на всех входах
- ✅ Логирование работает
- ✅ Обработка ошибок централизована
- ✅ Docker контейнеры работают

### Документация:
- ✅ README обновлён
- ✅ Swagger документация (опционально)
- ✅ Комментарии в коде сохранены

---

## 📝 Вопросы для согласования

Пожалуйста, подтверди следующие решения:

### 1. База данных
- [ ] **Вариант A:** TypeORM (переписать SQL)
- [ ] **Вариант B:** Prisma (переписать SQL)
- [X] **Вариант C:** Продолжить с pg + raw SQL *(рекомендуется)*

### 2. Валидация
- [X] **Вариант A:** class-validator + class-transformer *(рекомендуется)*
- [ ] **Вариант B:** Продолжить с Zod

### 3. Структура проекта
- [X] **Вариант A:** Modules в src/ *(рекомендуется)*
- [ ] **Вариант B:** Modules в src/modules/

### 4. Подход к миграции
- [ ] **Вариант A:** Постепенная (создать новую папку)
- [X] **Вариант B:** Прямая (переписать на месте) *(рекомендуется)*

### 5. Swagger документация
- [X] **Да**, добавить @nestjs/swagger
- [ ] **Нет**, пока не нужно

### 6. Сохранить старые файлы?
- [ ] **Да**, переместить в `/old` для справки
- [X] **Нет**, удалить после миграции *(рекомендуется)*

---

## 🚀 Готов начать?

После согласования решений выше, я начну миграцию поэтапно.

**Хочешь:**
- **A)** Начать миграцию с моими рекомендациями (отмечены [X])
- **B)** Изменить какие-то решения перед началом
- **C)** Добавить что-то в план

Напиши что выбираешь, и я начну! 🎯
