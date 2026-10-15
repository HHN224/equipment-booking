#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  echo '请先执行 cp .env.example .env，并配置本地数据库密码。' >&2
  exit 1
fi
set -a
source .env
set +a
export DB_URL="jdbc:mysql://localhost:${MYSQL_PORT:-3307}/${MYSQL_DATABASE:-equipment_booking}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true"
export DB_USERNAME="${MYSQL_USER:-equipment}"
export DB_PASSWORD="${MYSQL_PASSWORD:?请配置 MYSQL_PASSWORD}"
cd backend
exec mvn spring-boot:run
