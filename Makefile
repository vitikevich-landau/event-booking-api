.PHONY: help install dev build start docker-up docker-down docker-logs migrate-up migrate-down clean

help: ## Показать эту справку
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости
	npm install

dev: ## Запустить в режиме разработки
	npm run dev

build: ## Собрать проект
	npm run build

start: ## Запустить production версию
	npm start

docker-up: ## Запустить все сервисы через Docker
	docker-compose up --build

docker-down: ## Остановить Docker сервисы
	docker-compose down

docker-logs: ## Показать логи Docker
	docker-compose logs -f

docker-dev: ## Запустить только БД для локальной разработки
	docker-compose -f docker-compose.dev.yml up

migrate-up: ## Применить миграции
	npm run migrate:up

migrate-down: ## Откатить миграции
	npm run migrate:down

clean: ## Очистить node_modules и dist
	rm -rf node_modules dist

lint: ## Проверить код линтером
	npm run lint

format: ## Форматировать код
	npm run format
