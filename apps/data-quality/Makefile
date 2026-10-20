# Same targets in every app, so CI and developers run the same commands.
PY ?= python3

.PHONY: test test-backend test-frontend build api api-check dev-backend dev-frontend

test: test-backend test-frontend

test-backend:
	cd backend && $(PY) -m pytest -q

test-frontend:
	cd frontend && npm test

build:
	docker build -t data-quality-backend backend
	docker build -t data-quality-frontend frontend

# Regenerate the API contract from the backend code.
api:
	cd backend && $(PY) -c "import json; from data_quality_api.main import app; \
	print(json.dumps(app.openapi(), indent=2))" > ../api/openapi.json

# Fail if the committed contract is out of date (used in CI).
api-check: api
	git diff --exit-code -- api/openapi.json

dev-backend:
	cd backend && $(PY) -m uvicorn data_quality_api.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev
