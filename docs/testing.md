# 测试与验证

[返回项目首页](../README.md) · [手工验收](manual-checks.md)

## 前端

在 `frontend` 目录执行：

```bash
npm ci
npm run format:check
npm run build
```

`format:check` 检查源码、HTML 与配置文件的排版，不修改文件；需要自动修正时运行 `npm run format`。`build` 先执行 TypeScript 检查，再生成 Vite 生产构建。

## 后端：独立 MySQL 容器

准备 Docker 和根目录 `.env`，在项目根目录执行（Windows 使用 Git Bash / WSL）：

```bash
bash scripts/test-mysql.sh
```

脚本启动独立 `mysql-test` 服务，在 Java 25 / Maven 容器中执行 `mvn verify`，结束后停止测试数据库。MySQL 使用内存临时数据目录，不对外映射端口，测试不会操作开发数据库及其数据卷。

PowerShell 也可以直接执行等价步骤，`finally` 确保测试结束后停止测试库：

```powershell
try {
    docker compose --profile test up -d --wait mysql-test
    if ($LASTEXITCODE -ne 0) { throw '测试数据库启动失败' }
    docker compose --profile test run --rm test-runner
    if ($LASTEXITCODE -ne 0) { throw '后端测试失败' }
} finally {
    docker compose --profile test stop mysql-test
}
```

如果本地已安装 Java 25、Maven 和 Docker，可以在 `backend` 目录直接执行 `mvn verify`。未指定 `IT_DB_URL` 时，测试通过 Testcontainers 自动启动 MySQL 8.4；Docker 不可用会失败，不会跳过测试或替换为 H2。

## 使用已有测试库

提前创建专用 `equipment_booking_test` 库与有建表、读写权限的测试账号，再设置 `IT_DB_URL`、`IT_DB_USERNAME`、`IT_DB_PASSWORD`。以下为 Bash 示例，请替换端口和测试账号配置：

```bash
cd backend
IT_DB_URL='jdbc:mysql://127.0.0.1:3308/equipment_booking_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true' \
IT_DB_USERNAME=test IT_DB_PASSWORD=test-only mvn -B -ntp verify
```

**用例会清理测试库数据。测试库名必须包含 `equipment_booking_test`，不要指向开发库。** 设置 `IT_DB_URL` 后直接使用该 MySQL，不启动 Testcontainers。

## 测试覆盖什么

[BookingIntegrationTest.java](../backend/src/test/java/com/example/equipment/BookingIntegrationTest.java) 通过真实 Spring Security、MockMvc、业务事务和 MySQL 验证：

- 预约 → 领用 → 归还，实际时间记录与原时段占用保留。
- 取消释放后重新预约，终态和重复提交保护。
- 12 个并发预约只有 1 个成功，其余返回 409，数据库无孤立预约。
- 同设备不同预约的并发领用、取消与领用竞争、重复归还。
- 普通成员与管理员权限、他人记录保护、登录与 CSRF。
- 设备维护、停用规则、唯一编号和幂等初始化。
- 北京时间边界、日期窗口、筛选分页和非法输入。

## 2026-10-16 验证记录

| 检查 | 结果 |
| --- | --- |
| 前端 `npm run format:check` | 通过，Prettier 3.6.2 |
| 前端 `npm run build` | 通过，TypeScript 检查与 Vite 生产构建 |
| `bash scripts/test-mysql.sh` | 通过，Java 25 Maven 容器 + 独立 MySQL 8.4，`BUILD SUCCESS` |
| MySQL 集成测试 | 21 项通过，0 失败、0 错误、0 跳过 |
| 浏览器基本检查 | 管理员登录、真实设备列表、详情时段选择、借还记录、设备编辑表单打开与关闭、退出登录 |
| 响应式检查 | 1440px 桌面借还页，390px 手机设备库、设备详情与登录页均无页面级横向溢出 |
| Compose 与脚本 | `docker compose config --quiet`、`bash -n` 通过 |

此次浏览器检查未新增或修改预约、设备数据；写操作与并发行为由上述集成测试验证。测试报告生成在 `backend/target/surefire-reports/`，构建产物和报告不提交到 Git。

这些结果对应本次运行，不代表持续集成状态。仓库目前没有 GitHub Actions 测试工作流。
