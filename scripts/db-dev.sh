#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PG_DATA="${ROOT_DIR}/.data/postgres"
PG_PORT="${PG_PORT:-5433}"
PG_USER="${PG_USER:-$(whoami)}"
PG_DB="lifeline_dev"
PG_LOG="${ROOT_DIR}/.data/postgres.log"

mkdir -p "${ROOT_DIR}/.data"

case "${1:-start}" in
    init)
        if [ ! -d "${PG_DATA}" ]; then
            echo "[DB] Initializing local disposable PostgreSQL cluster at ${PG_DATA}..."
            initdb -D "${PG_DATA}" --auth=trust --no-instructions > /dev/null
            echo "[DB] Cluster initialized."
        else
            echo "[DB] Cluster directory already exists at ${PG_DATA}."
        fi
        ;;
    start)
        if [ ! -d "${PG_DATA}" ]; then
            "${SCRIPT_DIR}/db-dev.sh" init
        fi

        if pg_isready -h localhost -p "${PG_PORT}" > /dev/null 2>&1; then
            echo "[DB] PostgreSQL is already running on port ${PG_PORT}."
        else
            echo "[DB] Starting local PostgreSQL on port ${PG_PORT}..."
            pg_ctl -D "${PG_DATA}" -l "${PG_LOG}" -o "-p ${PG_PORT} -k /tmp" start
            sleep 1
        fi

        # Create database if not exists
        if ! psql -h localhost -p "${PG_PORT}" -U "${PG_USER}" -lqt | cut -d \| -f 1 | grep -qw "${PG_DB}"; then
            echo "[DB] Creating database ${PG_DB}..."
            createdb -h localhost -p "${PG_PORT}" -U "${PG_USER}" "${PG_DB}"
        fi
        echo "[DB] Ready on postgresql://${PG_USER}@localhost:${PG_PORT}/${PG_DB}"
        ;;
    stop)
        if [ -d "${PG_DATA}" ]; then
            echo "[DB] Stopping local PostgreSQL on port ${PG_PORT}..."
            pg_ctl -D "${PG_DATA}" stop -m fast || true
        fi
        ;;
    reset)
        echo "[DB] Resetting local disposable database..."
        "${SCRIPT_DIR}/db-dev.sh" stop || true
        rm -rf "${PG_DATA}" "${PG_LOG}"
        "${SCRIPT_DIR}/db-dev.sh" start
        echo "[DB] Reset complete."
        ;;
    *)
        echo "Usage: $0 {init|start|stop|reset}"
        exit 1
        ;;
esac
