# SLMS Infrastructure Makefile
# Usage: make [command]

.PHONY: up down logs reset ps health

# Default environment file
ENV_FILE := .env

# Check if .env exists, if not use env.example
ifneq ($(wildcard $(ENV_FILE)),)
    ENV_OPTION := --env-file $(ENV_FILE)
else
    ENV_OPTION := --env-file env.example
endif

# Start all infrastructure services
up:
	@echo "🚀 Starting SLMS infrastructure..."
	docker-compose $(ENV_OPTION) up -d
	@echo ""
	@echo "✅ Infrastructure started!"
	@echo ""
	@echo "Services available at:"
	@echo "  - PostgreSQL:    localhost:5544 (user: slms, password: slms, db: slms)"
	@echo "  - Redis:         localhost:$${REDIS_HOST_PORT:-6380}"
	@echo "  - MinIO API:     http://localhost:9000"
	@echo "  - MinIO Console: http://localhost:9001 (user: minioadmin, password: minioadmin)"
	@echo "  - Mailhog UI:    http://localhost:8025"
	@echo "  - Mailhog SMTP:  localhost:1025"

# Stop all infrastructure services
down:
	@echo "🛑 Stopping SLMS infrastructure..."
	docker-compose $(ENV_OPTION) down
	@echo "✅ Infrastructure stopped!"

# View logs from all services
logs:
	docker-compose $(ENV_OPTION) logs -f

# View logs from a specific service (usage: make logs-service SERVICE=postgres)
logs-service:
	docker-compose $(ENV_OPTION) logs -f $(SERVICE)

# Stop and remove all containers, networks, and volumes (DESTRUCTIVE!)
reset:
	@echo "⚠️  WARNING: This will remove all data!"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@echo "🗑️  Removing all infrastructure and data..."
	docker-compose $(ENV_OPTION) down -v --remove-orphans
	@echo "✅ Infrastructure reset complete!"

# Show running containers
ps:
	docker-compose $(ENV_OPTION) ps

# Check health of all services
health:
	@echo "🏥 Checking service health..."
	@echo ""
	@echo "PostgreSQL:"
	@docker exec slms-postgres pg_isready -U slms -d slms 2>/dev/null && echo "  ✅ Healthy" || echo "  ❌ Not ready"
	@echo ""
	@echo "Redis:"
	@docker exec slms-redis redis-cli ping 2>/dev/null && echo "  ✅ Healthy" || echo "  ❌ Not ready"
	@echo ""
	@echo "MinIO:"
	@curl -s http://localhost:9000/minio/health/live >/dev/null 2>&1 && echo "  ✅ Healthy" || echo "  ❌ Not ready"
	@echo ""
	@echo "Mailhog:"
	@curl -s http://localhost:8025 >/dev/null 2>&1 && echo "  ✅ Healthy" || echo "  ❌ Not ready"

# Restart all services
restart: down up

# Pull latest images
pull:
	docker-compose $(ENV_OPTION) pull

# Help
help:
	@echo "SLMS Infrastructure Commands"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  up       - Start all infrastructure services"
	@echo "  down     - Stop all infrastructure services"
	@echo "  logs     - View logs from all services (follow mode)"
	@echo "  reset    - Stop and remove all containers and volumes (DESTRUCTIVE!)"
	@echo "  ps       - Show running containers"
	@echo "  health   - Check health of all services"
	@echo "  restart  - Restart all services"
	@echo "  pull     - Pull latest Docker images"
	@echo "  help     - Show this help message"
