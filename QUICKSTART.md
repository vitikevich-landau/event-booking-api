# ⚡ Quick Start Guide

Запустить проект за 3 шага.

## 🚀 Вариант 1: Docker (Рекомендуется)

Самый быстрый способ - один Docker Compose запустит всё:

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd event-booking-api

# 2. Запустить всё
docker-compose up --build

# Готово! API работает на http://localhost:3000
```

**Проверка:**
```bash
curl http://localhost:3000/health
```

## 💻 Вариант 2: Локальная разработка

### Требования
- Node.js 18+ 
- PostgreSQL 15+
- npm

### Шаги

```bash
# 1. Установить зависимости
npm install

# 2. Запустить PostgreSQL через Docker (или использовать локальный)
docker-compose -f docker-compose.dev.yml up -d

# 3. Создать .env файл
cp .env.example .env
# DATABASE_URL уже настроен на localhost:5432

# 4. Запустить миграции
npm run migrate:up

# 5. Запустить в dev режиме
npm run dev

# API работает на http://localhost:3000
```

## 🧪 Тестирование API

### Через curl:

```bash
# 1. Проверить здоровье
curl http://localhost:3000/health

# 2. Получить события
curl http://localhost:3000/api/events

# 3. Создать бронирование
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "user_id": "test_user"}'
```

### Через httpie:

```bash
# Установить httpie
brew install httpie  # MacOS
# или
sudo apt install httpie  # Linux

# Создать бронирование
http POST localhost:3000/api/bookings/reserve event_id:=1 user_id=test_user
```

### Через готовый файл:

Открой `api-tests.http` в VS Code с расширением REST Client и запускай запросы.

## 📊 База данных

### Подключиться к PostgreSQL:

```bash
# Если используешь Docker:
docker exec -it event-booking-db psql -U postgres -d event_booking

# Локально:
psql -U postgres -d event_booking
```

### Полезные SQL команды:

```sql
-- Посмотреть события
SELECT * FROM events;

-- Посмотреть бронирования
SELECT * FROM bookings;

-- Статистика по событию
SELECT 
  e.name,
  e.total_seats,
  COUNT(b.id) as booked,
  e.total_seats - COUNT(b.id) as available
FROM events e
LEFT JOIN bookings b ON e.id = b.event_id
GROUP BY e.id;
```

## 🛠️ Полезные команды

```bash
# Разработка
make dev                # или npm run dev

# Миграции
make migrate-up         # применить
make migrate-down       # откатить

# Docker
make docker-up          # запустить всё
make docker-logs        # смотреть логи
make docker-down        # остановить

# Проверка окружения
./scripts/check-env.sh
```

## 🎯 Тестовые данные

После миграций доступны 3 события:

1. **Tech Conference 2025** (ID: 1) - 100 мест
2. **Music Festival** (ID: 2) - 500 мест  
3. **Workshop: Node.js** (ID: 3) - 30 мест

## 📖 Дальше

- Полная документация API: [README.md](README.md)
- Технические детали: [CONTRIBUTING.md](CONTRIBUTING.md)
- Примеры запросов: [api-tests.http](api-tests.http)

## ❓ Проблемы?

### Порт 3000 занят

```bash
# Изменить порт в .env
PORT=3001
```

### Ошибка подключения к БД

```bash
# Проверить что PostgreSQL запущен
docker ps

# Перезапустить
docker-compose -f docker-compose.dev.yml restart
```

### Миграции не применяются

```bash
# Убедиться что DATABASE_URL правильный
echo $DATABASE_URL

# Применить принудительно
npm run migrate:up
```
