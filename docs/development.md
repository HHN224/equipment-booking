# 开发指南

[返回项目首页](../README.md)

## 环境版本

版本以 [package.json](../frontend/package.json)、[pom.xml](../backend/pom.xml) 和 [compose.yaml](../compose.yaml) 为准。

| 组件 | 项目配置 |
| --- | --- |
| Java / Maven | Java 25 / Maven 3.9.11 容器；本地 Maven 可用 3.9.x |
| Spring Boot | 3.5.16；管理 Spring Security、JDBC、Flyway 等依赖 |
| MySQL | 8.4，InnoDB |
| Node.js | 项目要求 ≥22.12；本次前端验证使用 24.15.0 |
| React / React Router | 19.3.1 / 7.18.4 |
| TypeScript / Vite | 5.9.3 / 8.3.4 |
| Prettier | 3.6.2 |

前端提交了 `package-lock.json`，使用 `npm ci` 安装锁定的依赖。容器启动方式见 [快速启动](../README.md#快速启动)。

## 本地调试后端

适合需要在 IDE 中断点调试 Java 的情况。准备 Java 25、Maven 3.9.x 与 Docker；先确认 `java -version`、`mvn -version` 都使用 Java 25。

从项目根目录开始，仅在第一次复制配置：

```bash
cp .env.example .env
docker compose up -d --wait mysql
bash scripts/start-backend.sh
```

脚本自动读取根目录 `.env`，把 `MYSQL_*` 转换为 Spring Boot 需要的 `DB_*`。Windows 可使用 Git Bash / WSL；如果 IDE 直接启动 Java，则在运行配置中填写下表的环境变量。

如果之前启动了容器后端，先执行 `docker compose stop backend`，避免争用 8080 端口。前端仍在另一终端运行 `npm run dev`。

## 使用已有 MySQL

提前创建 `equipment_booking` 数据库及有建表、读写权限的账号，设置以下环境变量后，在 `backend` 目录运行 `mvn spring-boot:run`。Flyway 自动创建表结构，无需手动执行 SQL 文件。

| 环境变量 | 含义 / 示例 |
| --- | --- |
| `DB_URL` | `jdbc:mysql://localhost:3307/equipment_booking?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true` |
| `DB_USERNAME` | 你的数据库账号 |
| `DB_PASSWORD` | 该账号对应的密码 |
| `SERVER_PORT` | 后端端口，默认 `8080` |
| `DEMO_DATA_ENABLED` | 默认 `true`；`false` 关闭演示数据初始化，但也不会自动创建登录账号 |

环境变量语法：PowerShell 使用 `$env:DB_USERNAME = 'equipment'`，Bash 使用 `export DB_USERNAME=equipment`。根目录 `.env` 由 Compose 和启动脚本读取，直接运行 Maven 时不会自动加载。

## 地址与端口

| 服务 | 默认地址 |
| --- | --- |
| 前端开发服务 | <http://localhost:5173> |
| 后端 API | `http://localhost:8080/api` |
| MySQL | `127.0.0.1:3307`，数据库 `equipment_booking` |
| 前端构建预览 | <http://localhost:4173>，执行 `npm run build` 后再 `npm run preview` |

浏览器请求 `/api`，由 Vite 代理到后端；登录使用 HttpOnly Session Cookie。开发与预览服务均已配置代理，预览时也需要后端运行。

修改根目录 `.env` 的 `SERVER_PORT` 后，将 [frontend/.env.example](../frontend/.env.example) 复制为 `frontend/.env`，同步修改 `API_PROXY_TARGET`，再重启 Vite。Compose 的端口映射默认只绑定本机。

## 常见问题

| 现象 | 检查方法 |
| --- | --- |
| 首次启动较慢 | `docker compose logs -f backend` 查看依赖下载和编译进度；启动成功后再登录 |
| 提示无法连接后端 | `docker compose ps` 检查服务，核对 `API_PROXY_TARGET` 和后端端口 |
| 本地 Maven 编译报 Java 版本错误 | 确认 `JAVA_HOME`、IDE JDK 和 `mvn -version` 指向 Java 25 |
| 修改 `.env` 密码后无法连接数据库 | `.env` 不会修改已初始化数据库里的密码；需同步数据库账号密码或恢复原配置 |
| 重启后演示记录没变 | 初始化只执行一次；日期、状态和已有修改会保留，见 [初始化说明](business-rules.md#演示账号与初始化) |
| 换账号后其他标签页也切换身份 | 普通标签页共享 Cookie；多账号验收使用不同浏览器或独立用户配置 |

平时停止服务用 `docker compose stop`，下次继续按快速启动命令启动。只有确定不要开发数据时才使用 `docker compose down -v`，它会删除数据库卷和 Maven 缓存。
