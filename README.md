# 共用间 · 小型团队共享设备预约与借还系统

React + TypeScript + Vite 前端，Java + Spring Boot 单体后端，MySQL InnoDB 持久化。代码按认证、设备、预约组织，使用 Spring JDBC 显式 SQL，方便观察事务和数据库约束。界面为中文，桌面侧栏布局，支持手机基本操作。

## 环境与版本

| 组件 | 本项目版本 / 要求 |
| --- | --- |
| Java | 25 LTS（本项目编译目标与容器运行时） |
| Maven | 3.9.11；本地可使用 3.9.x |
| Spring Boot | 3.5.16，使用其依赖管理中的 Spring Security、Flyway、JDBC 驱动与 Testcontainers |
| MySQL | 8.4 LTS，InnoDB；Compose 使用官方 `mysql:8.4` |
| Node.js | 建议 22 LTS，至少 22.12；本次前端构建使用 26.0.0 |
| React / React Router | 19.3.1 / 7.18.4 |
| TypeScript / Vite | 5.9.3 / 8.3.4 |
| Docker | 支持 Docker Compose v2 或更新版本 |

版本依据：[Spring Boot 3.5 环境要求](https://docs.spring.io/spring-boot/3.5/system-requirements.html)、[Vite 环境要求](https://vite.dev/guide/)。前端提交 `package-lock.json`，请用 `npm ci` 安装一致的依赖。Java 25 是本项目当前采用的 LTS 版本，并受 Spring Boot 3.5 支持。

## 快速启动

在项目根目录执行，以下命令适用于 macOS / Linux；Windows 推荐 WSL2。

```bash
cp .env.example .env
docker compose up -d --wait mysql
```

`.env` 中的密码仅是本地开发示例，请按需修改。配置文件不会提交；第一次初始化数据库后，修改 `.env` 不会自动修改数据库内的既有密码。

**方式 A：本地 Java 25 + Maven，后端单独运行**

```bash
bash scripts/start-backend.sh
```

该脚本把根目录 `.env` 中的 `MYSQL_*` 转换为后端 `DB_*` 环境变量。也可以手动设置 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` 后，在 `backend` 目录运行 `mvn spring-boot:run`。URL 示例：`jdbc:mysql://localhost:3307/equipment_booking?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true`。

**方式 B：没有本地 Java / Maven，使用 Java 25 容器运行后端**

```bash
docker compose --profile app up -d backend
docker compose logs -f backend
```

首次启动会下载 Maven 依赖并编译，看到 `Started EquipmentBookingApplication` 后即可访问。此方式仍是同一个 Java 后端，前后端独立运行。停止后端：`docker compose stop backend`。

**另开终端运行前端**

```bash
cd frontend
npm ci
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。浏览器统一从 Vite 的 `/api` 代理访问后端，使用 HttpOnly Session Cookie，不在 localStorage 保存凭据。

| 服务 | 默认地址 / 配置 |
| --- | --- |
| 前端 | `http://localhost:5173` |
| 后端 | `http://localhost:8080/api` |
| MySQL | `127.0.0.1:3307`，库 `equipment_booking`，账号 `equipment` |
| 前端生产构建预览 | `npm run build && npm run preview`，`http://localhost:4173` |

根目录 `.env` 可调整 `MYSQL_PORT`、`SERVER_PORT`、数据库名与密码。若修改后端端口，请复制 `frontend/.env.example` 为 `frontend/.env`，相应修改 `API_PROXY_TARGET`。所有容器映射端口默认仅绑定本机。

## 演示账号与初始化

| 角色 | 账号 | 密码 | 显示名 |
| --- | --- | --- | --- |
| 管理员 | `admin` | `Admin123!` | 林老师 |
| 成员 | `member1` | `Member123!` | 陈小雨 |
| 成员 | `member2` | `Member123!` | 周明 |

**这些是公开的本地开发演示账号，只用于学习，不可直接用于公网部署。** 密码入库前由 Spring Security BCrypt 编码，数据库不保存明文密码。

Flyway 在首次启动时执行 `backend/src/main/resources/db/migration/V1__schema.sql`，后续启动校验迁移版本，不重新建表。`DemoDataInitializer` 在独立事务中锁定 `demo_seed` 行，仅初始化一次：3 个账号、8 台设备、4 条分别处于已预约、已领用、已归还、已取消状态的演示记录。日期基于初始化当天的北京时间生成；重复启动不会重新插入、移动日期或覆盖用户修改。

8 台设备覆盖相机、投影仪、测试手机与音频设备；两台索尼 A7 IV 是两个独立编号。便携投影仪默认暂停新预约，方便体验停用规则。初始化中的已领用记录为状态展示，管理员可人工确认归还。

`DEMO_DATA_ENABLED=false` 可关闭演示初始化，但此时不会自动创建账号。学习项目默认开启。需要全新演示数据时，先确认开发数据可以删除，再手动执行 `docker compose down -v` 后重新启动；此操作会删除该 Compose 项目的数据库卷及 Maven 缓存。通常只需停止服务，保留卷即可。

## 已实现业务与第一版取舍

- 登录、退出、登录会话恢复，后端认证与角色校验，写接口 CSRF 防护。
- 设备名称搜索、分类筛选、分页；设备详情、按日期查看两个时段是否占用。
- 成员预约、自己的记录筛选与分页、取消尚未领用的预约。
- 管理员新增、编辑设备和预约开关；按日期、实物设备、成员姓名/账号、状态筛选全部记录，确认领用和归还。
- 关键操作确认弹窗，提交按钮禁用，加载、空数据、错误、成功反馈，日期和表单校验。
- 分类为管理员输入的简单文本，从已有设备去重生成筛选项。设备不删除，历史记录继续关联设备当前名称、编号；设备 ID 不变。
- 业务时区统一 `Asia/Shanghai`。日期窗口为今天到今天 +30 天，首尾包含，共 31 个日期。上午 09:00—12:00，下午 14:00—18:00；只要当前时段尚未结束就可预约，恰好结束时禁止。领用不限制日期，由管理员人工判断。
- 已预约 → 已领用 → 已归还，或已预约 → 已取消。已归还与已取消不可继续操作。过期未领用不自动取消。
- 取消仅本人可操作，包括管理员也不能取消他人的预约；管理员拥有自己的成员功能。
- 时段占用信息只返回占用布尔值、可预约状态和提示，不返回他人姓名、账号、用户 ID 或预约 ID。
- 预约列表展示领用和实际归还时间。时间点以 UTC 存入 MySQL `TIMESTAMP`，接口用 ISO-8601，前端固定按北京时间展示，日期字段使用 MySQL `DATE`。
- Session 存在后端内存，重启后需要重新登录；默认 8 小时闲置失效。数据库记录不受影响。

未引入 Redis、消息队列、微服务、审批或自动取消任务；没有注册、找回密码、支付、押金、多组织和真实通知。无外部图片或字体依赖，插图为本地 SVG。

## 为什么并发控制有效

核心代码在 `ReservationService`，全部写业务使用公开方法上的 `@Transactional`，由 Spring 代理调用。

1. **统一锁顺序：设备 → 预约。** 所有预约创建、取消、领用、归还及设备编辑都先 `SELECT equipment ... FOR UPDATE` 锁定同一台实物。修改既有预约时，先只读其不可变的设备 ID 和可见性，再锁设备、`SELECT reservation ... FOR UPDATE` 获取最新状态。同设备的写请求串行化；其他设备不互相阻塞。不会拿着预约锁反过来等设备锁。
2. **占用靠唯一约束兜底。** `slot_occupancy` 主键为 `(equipment_id, reservation_date, slot)`。创建预约后直接插入占用，不以“先查空闲”作为防重措施。唯一键冲突转成 HTTP 409 和中文提示，整笔事务回滚，失败请求不会留下额外预约记录。复合外键保证占用引用的设备、日期、时段与预约一致。
3. **取消与释放原子完成。** 在一笔事务内检查当前状态、条件更新 `WHERE status='RESERVED'`、删除该预约的占用。任一步失败整体回滚。按 `reservation_id` 删除且先校验状态，旧预约的重复取消不会删除新预约的占用。
4. **实物领用另有唯一约束。** `active_loan` 以 `equipment_id` 为主键，预约 ID 也唯一。即使两个管理员操作的是不同日期/时段的两条预约，也只能成功领出一次。状态更新失败会连同领用插入回滚。
5. **归还保留占用历史。** 只把 `PICKED_UP` 条件更新为 `RETURNED`、记录实际时间、删除 `active_loan`；不删除 `slot_occupancy`，提前归还不开放原时段。
6. **重复提交可解释且安全。** 前端禁用提交按钮，后端再次检查状态或遇到唯一键冲突后返回 409。无需引入幂等键：重复请求不会增加预约或重复借还；取消后重新预约属于新的有效业务操作。死锁/锁等待异常返回可重试提示，不在后台悄悄重复业务。

权限也在后端执行：Spring Security 保护 `/api/admin/**`，管理员控制器有 `@PreAuthorize`，借还 Service 再检查管理员身份。单条预约只对本人和管理员可见；我的记录从登录身份取用户 ID，不信任请求中的用户 ID；取消始终检查所有者。

## 自动化验证

### 真实 MySQL 测试（推荐，无需本机 Java）

```bash
bash scripts/test-mysql.sh
```

脚本启动独立 `mysql-test` 服务（MySQL 8.4、内存临时数据目录，无对外端口），在 Java 25 Maven 容器内执行 `mvn verify`，最后停止测试数据库。测试库名强制包含 `equipment_booking_test`；用例会清理这个专用数据库，**不要把它配置到开发数据库**。测试不会操作开发 `mysql` 服务和开发数据卷。

有 Java 25 + Maven + 可用 Docker 时，也可直接运行：

```bash
cd backend
mvn verify
```

没有配置 `IT_DB_URL` 时测试自动启动 `MySQLContainer("mysql:8.4")`。Docker 不可用时会明确失败，不会跳过或改用 H2。也支持显式提供专用测试库的 `IT_DB_URL`、`IT_DB_USERNAME`、`IT_DB_PASSWORD`。

`BookingIntegrationTest` 通过真实 Spring Security、MockMvc 接口层、业务事务与 MySQL 验证：

- 完整预约 → 管理员领用 → 归还，实际归还时间和占用保留。
- 取消释放后另一成员重新预约。
- 12 个并发预约恰好 1 个成功、11 个冲突，数据库仅有 1 条预约与占用。
- 绕过业务代码直接验证时段唯一键，冲突事务回滚无孤立预约。
- 普通成员不能调用管理接口、查看或取消他人预约，管理员也不能取消他人的预约。
- 取消/归还是终态，重复操作不破坏记录。
- 两个独立管理员会话同时领用同设备的不同预约，仅一个成功。
- 取消与领用竞争、重复归还竞争及取消后重试，最终状态与占用一致。
- 停用拒绝新预约，已有借还流程仍可完成。
- 北京时间边界、30 天窗口、搜索筛选分页、空值及非法输入、BCrypt、实际登录/CSRF/退出。
- 初始化只执行一次，演示日期跟随业务时钟。

前端检查：

```bash
cd frontend
npm ci
npm run build
```

### 本次执行记录

以下为 2026-10-15、Java 21 时的既有验证记录。项目之后已升级到 Java 25；需在 Java 25 上重新执行验证以确认新运行时。

| 验证 | 实际结果 |
| --- | --- |
| 后端 `mvn -B -ntp verify` | **通过**，Java 21.0.12.1 + Maven 3.9.11，生成可执行 JAR |
| MySQL 集成测试 | **21 项通过，0 失败、0 错误、0 跳过**，使用真实 MySQL Community 8.4.11 / InnoDB 独立测试库 |
| 并发预约 | **通过**：12 个并发请求，1 个成功、11 个 409，预约表和占用表各只有 1 条记录 |
| 并发借还与权限 | **通过**：不同管理员会话重复领用、取消与领用竞争、重复归还、成员越权与终态保护 |
| 设备维护与初始化 | **通过**：新增/编辑、设备编号唯一、停用后处理已有借还、初始化重复执行不增加数据 |
| React 生产构建 | **通过**：`npm run build`（TypeScript 检查 + Vite 构建） |
| 运行依赖审计 | **通过**：`npm audit --omit=dev --registry=https://registry.npmjs.org`，0 个已知漏洞；这不等同于完整安全审计 |
| 浏览器实际接口验收 | **通过**：成员登录、真实设备加载、预约、取消释放、另一成员重新预约、管理员领用与归还、设备编辑保存；页面显示实际借还时间，归还后原时段仍被占用 |
| 手机布局 | **通过基本检查**：390px 视口显示 8 台真实设备，页面宽度为 390px，无整体横向溢出；导航可横向滚动 |
| Compose 配置及脚本语法 | **通过**：`docker compose config --quiet`、`bash -n` |
| Docker / Testcontainers 启动路径 | **未验证成功**：当时镜像仓库及镜像源下载出现 EOF / 超时，因此使用官方原生 MySQL 和 Java 21 完成上述数据库测试；没有使用 H2、mock 数据库或跳过测试 |

2026-10-15 的测试报告当时位于 `backend/target/surefire-reports/com.example.equipment.BookingIntegrationTest.txt`；Java 25 clean build 清理了旧报告，本次尚未在 Java 25 上执行测试。当前 Java 25 可执行后端位于 `backend/target/equipment-booking-1.0.0.jar`（构建产物不提交版本库）。此前临时数据库监听 `127.0.0.1:3308`，与 Compose 默认的 `3307` 分开；开发库与测试库也互相独立。此前验证未修改系统 Java 或 MySQL 安装。下载包来自 [MySQL 官方下载页](https://dev.mysql.com/downloads/mysql/8.4.html) 和 Azul 官方 Java 21 分发。

已有本地 MySQL 时，可以不经过容器运行测试，例如提前创建专用 `equipment_booking_test` 库并设置对应账号权限，然后执行：

```bash
cd backend
IT_DB_URL='jdbc:mysql://127.0.0.1:3308/equipment_booking_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true' \
IT_DB_USERNAME=test IT_DB_PASSWORD=test-only mvn -B -ntp verify
```

这里的密码为本地测试示例，须与自己的测试库配置一致。`IT_DB_URL` 设置后直接使用该真实 MySQL，不尝试启动 Testcontainers。

## 手工验收：三个账号体验完整流程

建议使用三个相互隔离的浏览器用户配置/不同浏览器，分别登录 `member1`、`member2`、`admin`。同一浏览器的普通标签页共享登录 Cookie；切换账号会影响其他标签页。

1. 成员 1 在设备库选择 **CAM-002**，选明天上午，检查确认弹窗中的设备编号、日期、时段，提交预约。在“我的预约”看到“已预约”。
2. 成员 2 查看同设备同日期，上午显示已被预约，且看不到成员 1 的个人信息。也可先让两个成员同时打开空闲时段，各自选好后先后提交，后提交者收到冲突提示。
3. 成员 1 在“我的预约”确认取消。成员 2 重新查询该日期，可以预约上午；成员 1 原记录保留“已取消”。
4. 管理员进入“预约与借还”，按明天、CAM-002 和 member2 筛选，核对后确认领用。成员 2 刷新后看到“已领用”，取消按钮消失。
5. 成员 1 为 CAM-002 预约明天下午。管理员尝试对下午记录确认领用，收到“设备尚未归还”的提示，下午记录保持“已预约”。
6. 管理员对成员 2 的上午记录确认归还。成员 2 看到“已归还”和实际归还时间；上午仍不能重新预约。管理员此时可以确认下午记录领用。
7. 在“设备管理”编辑 CAM-002，取消“开放新预约”。成员无法再为其创建预约；管理员仍可处理已存在的下午领用/归还。重新勾选可恢复新预约。
8. 成员账号直接访问管理员页面会回到设备库；直接调用管理接口返回 403。退出后受保护接口返回 401。可使用自动化测试进一步验证越权与并发。

## 主要代码阅读顺序

React 页面都放在 `frontend/src/views/`，采用函数组件和普通 Hooks：`useState` 保存表单/加载状态，`useEffect` 在打开页面或筛选条件改变时读取接口，事件处理函数负责提交。`App.tsx` 定义路由和导航，`providers.tsx` 只共享登录状态与短提示，没有额外的状态管理框架。

围绕“页面提交预约 → 后端校验 → 数据库占用 → 返回结果”阅读：

1. `frontend/src/views/EquipmentDetailView.tsx`：获取服务器日期窗口、查询占用、选择日期与时段、确认并提交。
2. `frontend/src/api.ts`：同源请求、获取 CSRF token、解析后端中文错误；成功后页面跳到我的预约。
3. `backend/.../config/SecurityConfig.java`、`auth/AuthController.java`：请求首先经过会话认证、CSRF、角色校验，登录身份由 `@AuthenticationPrincipal` 注入。
4. `backend/.../reservation/ReservationController.java`：参数绑定与 Bean Validation，把设备/日期/时段和登录用户交给业务层。
5. `backend/.../reservation/ReservationService.java` 的 `book`：进入事务 → 锁设备 → 检查开关与北京时间 → 写预约 → 写占用 → 返回预约视图。冲突异常导致整体回滚。
6. `backend/src/main/resources/db/migration/V1__schema.sql`：查看时段主键、复合外键和 `active_loan` 的设备主键，再回看 Service 的 `cancel`、`pickup`、`returnEquipment`。
7. `backend/.../common/ApiExceptionHandler.java`：异常如何转成 400/403/404/409 及中文提示；`frontend/src/views/ReservationsView.tsx` 展示结果和状态操作。
8. `backend/src/test/java/com/example/equipment/BookingIntegrationTest.java`：通过并发请求和数据库断言验证上述保证。`config/DemoDataInitializer.java` 展示幂等初始化。

其中 `backend/...` 表示 `backend/src/main/java/com/example/equipment/`。

## 已知限制与后续学习方向

此版面向单机本地学习，未配置公网 HTTPS、登录限流、账号停用或密码更改、持久化会话、监控告警、备份、生产打包部署流水线。设备写操作按实物行串行，适合小团队且逻辑清晰；高吞吐时可在保留数据库约束的前提下缩小锁范围。前端时段查询是即时快照，其他成员提交后不会自动推送，需要刷新或重新查询；最终是否成功始终由后端事务决定。

后续可依次学习：事务隔离与锁等待观察 → 设备查询缓存及更新失效 → 事务提交后的通知与消息可靠性 → 生产构建、反向代理与部署。添加缓存或队列时，数据库约束和状态检查仍应保留。
