#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# 专用临时 MySQL；只停止测试服务，不影响开发数据库与后端。
cleanup() { docker compose --profile test stop mysql-test >/dev/null; }
trap cleanup EXIT
docker compose --profile test up -d --wait mysql-test
docker compose --profile test run --rm test-runner
