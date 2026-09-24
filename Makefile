.PHONY: up down dev backend frontend install install-backend install-frontend logs stop

up:
	docker compose up -d

down:
	docker compose down

stop: down

install: install-backend install-frontend

install-backend:
	cd backend/core_api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

backend:
	cd backend/core_api && .venv/bin/uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev: up
	@trap 'kill 0' EXIT; \
	(cd backend/core_api && .venv/bin/uvicorn app.main:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

logs:
	docker compose logs -f
