#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)

if docker compose version >/dev/null 2>&1; then
  compose() {
    docker compose "$@"
  }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() {
    docker-compose "$@"
  }
else
  echo "ERROR: Docker Compose is not available. Install 'docker compose' or 'docker-compose'." >&2
  exit 1
fi

echo "Restarting bilet-frontend"
compose -f "${PROJECT_DIR}/compose.yaml" --project-directory "${PROJECT_DIR}" restart bilet-frontend
