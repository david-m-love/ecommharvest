#!/usr/bin/env bash
# Local Postgres for development. Production uses Neon; this exists so `npm run
# dev` works with no cloud account, against the same engine as production.
set -euo pipefail

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}"
PGDATA="${PGDATA:-/var/lib/postgresql/ech}"
PORT="${PGPORT:-5433}"
DB="${PGDATABASE:-ecommharvest}"

if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/initdb" ]; then
  echo "Postgres server binaries not found. Set PGBIN, or use a hosted database." >&2
  exit 1
fi

as_pg() { su postgres -s /bin/sh -c "$1"; }

case "${1:-start}" in
  start)
    if [ ! -s "$PGDATA/PG_VERSION" ]; then
      mkdir -p "$PGDATA"; chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"
      as_pg "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
    fi
    if as_pg "$PGBIN/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
      echo "already running on port $PORT"
    else
      as_pg "$PGBIN/pg_ctl -D $PGDATA -o '-p $PORT -c listen_addresses=127.0.0.1' -l $PGDATA/pg.log start" >/dev/null
      sleep 2
    fi
    "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -tAc \
      "select 1 from pg_database where datname='$DB'" | grep -q 1 \
      || "$PGBIN/createdb" -h 127.0.0.1 -p "$PORT" -U postgres "$DB"
    echo "postgres ready: postgres://postgres@127.0.0.1:$PORT/$DB"
    ;;
  stop)
    as_pg "$PGBIN/pg_ctl -D $PGDATA stop" >/dev/null 2>&1 && echo stopped || echo "not running"
    ;;
  *) echo "usage: $0 {start|stop}" >&2; exit 1 ;;
esac
