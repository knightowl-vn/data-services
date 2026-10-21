# Same targets in every product, so CI and developers run the same commands.
PY ?= python3

.PHONY: test test-api test-web build api api-check dev-api dev-web

test: test-api test-web

test-api:
	cd api && $(PY) -m pytest -q

test-web:
	cd web && npm test

build:
	docker build -t data-quality-api api
	docker build -t data-quality-web -f web/Dockerfile ../..   # repo root: needs libs/web

# Regenerate the API contract (api/openapi.json) from the code.
api:
	cd api && $(PY) -c "import json; from data_quality_api.main import app; \
	print(json.dumps(app.openapi(), indent=2))" > openapi.json

# Fail if the committed contract is out of date (used in CI).
api-check: api
	git diff --exit-code -- api/openapi.json

dev-api:
	cd api && $(PY) -m uvicorn data_quality_api.main:app --reload --port 8000

dev-web:
	cd web && npm run dev
