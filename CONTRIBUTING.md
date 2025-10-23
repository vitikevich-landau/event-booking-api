# 🏗️ Технические детали и архитектура

## Архитектурные решения

### Защита от Race Conditions

Проблема возникает когда несколько пользователей одновременно пытаются забронировать последнее место:

```
User A: SELECT доступные места → 1 место свободно
User B: SELECT доступные места → 1 место свободно (одновременно)
User A: INSERT бронирование → Успех
User B: INSERT бронирование → Успех (проблема!)
```

**Решение:** Пессимистичная блокировка с `SELECT ... FOR UPDATE`

```typescript
// В транзакции блокируем строку события
await client.query('BEGIN');
const event = await client.query(
  'SELECT * FROM events WHERE id = $1 FOR UPDATE',
  [eventId]
);

// Теперь только этот клиент может изменять это событие
// Другие запросы будут ждать освобождения блокировки
```

### Защита от дублирования бронирований

**Уровень БД:** Уникальный индекс
```sql
CONSTRAINT unique_user_event UNIQUE (event_id, user_id)
```

Если пользователь попытается создать дубль, PostgreSQL вернет ошибку `23505` (unique violation), которую мы обрабатываем в коде:

```typescript
if (error.code === '23505') {
  throw new ConflictError('User has already booked this event');
}
```

## Слои архитектуры

### 1. Controllers (HTTP Layer)
- Принимают HTTP запросы
- Парсят параметры
- Вызывают сервисы
- Возвращают HTTP ответы

### 2. Services (Business Logic)
- Координируют работу между репозиториями
- Содержат бизнес-логику
- Не знают об HTTP

### 3. Repositories (Data Access)
- Единственный слой, работающий с БД
- Содержат SQL запросы
- Управляют транзакциями

### 4. Validators (Input Validation)
- Zod схемы для валидации
- Проверка типов и ограничений
- Преобразование данных

### 5. Middleware
- Error handling
- Request logging
- Body parsing

## Connection Pool

Используется пул соединений для эффективной работы с БД:

```typescript
const pool = new Pool({
  max: 20,                      // Максимум 20 соединений
  idleTimeoutMillis: 30000,     // Закрыть неактивные через 30 сек
  connectionTimeoutMillis: 2000 // Таймаут подключения 2 сек
});
```

**Преимущества:**
- Переиспользование соединений
- Автоматическое управление
- Защита от утечек

## Error Handling

Централизованная обработка ошибок через middleware:

```typescript
// Custom errors с HTTP кодами
class NotFoundError extends AppError {
  constructor(message) {
    super(404, message);
  }
}

// Middleware автоматически обрабатывает
app.use(errorHandler);
```

## Graceful Shutdown

При получении SIGTERM/SIGINT:
1. Останавливаем прием новых запросов
2. Завершаем текущие запросы
3. Закрываем БД соединения
4. Выходим из процесса

```typescript
process.on('SIGTERM', gracefulShutdown);
```

## Логирование

Structured JSON logging для легкого парсинга:

```json
{
  "timestamp": "2025-01-15T10:00:00.000Z",
  "level": "info",
  "message": "Creating booking",
  "meta": {
    "eventId": 1,
    "userId": "user123"
  }
}
```

## Валидация окружения

Zod схема валидирует переменные окружения при старте:

```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number).pipe(z.number().positive())
});
```

Если конфигурация невалидна → приложение не запустится.

## Индексы БД

```sql
-- Ускоряют поиск бронирований
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

-- Уникальность на уровне БД
CREATE UNIQUE INDEX unique_user_event ON bookings(event_id, user_id);
```

## Security

- **Helmet** - защита HTTP заголовков
- **CORS** - настройка CORS
- **Validation** - Zod проверяет все входные данные
- **SQL Injection** - параметризованные запросы

```typescript
// ✅ БЕЗОПАСНО - параметризованный запрос
pool.query('SELECT * FROM events WHERE id = $1', [eventId]);

// ❌ ОПАСНО - конкатенация строк
pool.query(`SELECT * FROM events WHERE id = ${eventId}`);
```

## Масштабирование

Текущая архитектура поддерживает горизонтальное масштабирование:

- Stateless API - можно запустить несколько инстансов
- Connection pool - эффективное использование БД
- Транзакции - гарантируют консистентность при конкурентности

Для дальнейшего роста можно добавить:
- Redis для кеширования
- Message queue для асинхронных задач
- Read replicas для чтения
- Sharding для больших объемов данных

## Тестирование

Рекомендуемые библиотеки для тестов:

```bash
npm install --save-dev jest supertest @types/jest @types/supertest
```

Пример теста:

```typescript
describe('POST /api/bookings/reserve', () => {
  it('should create booking', async () => {
    const res = await request(app)
      .post('/api/bookings/reserve')
      .send({ event_id: 1, user_id: 'test' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
  
  it('should not allow duplicate booking', async () => {
    await request(app)
      .post('/api/bookings/reserve')
      .send({ event_id: 1, user_id: 'test' });
    
    const res = await request(app)
      .post('/api/bookings/reserve')
      .send({ event_id: 1, user_id: 'test' });
    
    expect(res.status).toBe(409);
  });
});
```

## Best Practices

1. **Всегда используй транзакции** для операций изменяющих несколько таблиц
2. **Всегда закрывай клиенты** - используй `finally { client.release() }`
3. **Логируй важные операции** - для debugging и мониторинга
4. **Валидируй входные данные** - защита от некорректных данных
5. **Используй типы TypeScript** - меньше ошибок в рантайме
6. **Обрабатывай все ошибки** - graceful degradation

## Мониторинг

Рекомендуемые метрики для production:

- Request rate (requests/sec)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database connection pool usage
- Memory & CPU usage

Инструменты: Prometheus + Grafana, DataDog, New Relic

## CI/CD

Пример GitHub Actions workflow:

```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```
