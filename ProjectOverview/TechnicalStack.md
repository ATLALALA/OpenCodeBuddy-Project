# 技术实现方案.md

> 项目：OpenCode Buddy（OpenCode 插件 + Electron/Tauri + PixiJS）
> 版本：v0.1（MVP）
> 最后更新：2026-02-05
> 主目标：稳定把 OpenCode 的 session/todo 状态同步到桌面挂件，并以 PixiJS 渲染挂机像素战斗

---

## 0. 技术选型结论（vibecoding 优先）

### 推荐默认：Electron + Vite + PixiJS（最快迭代）

* Node 生态完整：文件监听（chokidar）、进程管理、托盘、窗口控制成熟
* 热更新与调试体验好，适合快速迭代玩法与渲染表现

### 可选替代：Tauri + Vite + PixiJS（更轻，但前期摩擦略高）

* 体积小、资源占用低
* 文件监听、托盘、进程管理等能力需通过 Tauri API/插件实现，MVP 阶段可能比 Electron 慢一点

> 本方案以 Electron 为主路径；Tauri 的替换点在关键模块说明中给出。

---

## 1. OpenCode 侧能力边界与接口来源

### 1.1 插件上下文与能力

OpenCode 插件会收到 `project / client / $ / directory / worktree` 等上下文，其中：

* `$` 是 Bun shell API，可执行本地命令（用于可选的“自动拉起桌面端”）
* `.opencode/package.json` 可声明插件依赖，OpenCode 启动时会执行 `bun install` 安装依赖
  来源：官方插件文档。

### 1.2 事件订阅（本项目最小集）

官方事件列表包含（与本项目相关）：

* Session：`session.created / session.deleted / session.idle / session.status / session.updated`
* Todo：`todo.updated`
* Message：`message.updated`（可选：只记录时间戳，避免隐私问题）
* Tool：`tool.execute.before/after`（可选：增强 busy 语义）
  来源：官方插件事件列表。

### 1.3 备选实时通道（后续升级口）

OpenCode server 提供 `/global/event` SSE，并且 `opencode` 运行时采用 client/server 架构（TUI 与 server 同时工作）。这为后续“桌面端直接连 SSE”提供升级路径。

> MVP 不建议直接依赖 SSE：会引入端口、鉴权、多实例、跨项目管理等复杂度。先用“文件桥接”更稳。

---

## 2. 总体架构与数据流（MVP：文件桥接）

### 2.1 数据流

OpenCode CLI（TUI）启动
→ 插件订阅事件（session/todo/message）
→ 插件 Reduce 成你定义的 BridgeState
→ 写入 worktree 下的 `.opencode/gamify/state.json`（覆盖写）与 `events.ndjson`（追加写）
→ 桌面端（Electron）监听 `state.json` 变化
→ 渲染进程将 BridgeState Reduce 成 WorkState
→ game-core 推进 BattleState/TaskState
→ PixiJS 渲染战斗

### 2.2 为什么 MVP 选“文件桥接”

* 不占端口、不受防火墙影响、无鉴权成本
* 桥接协议由你定义，OpenCode 事件变化只影响插件层，桌面端稳定
* `events.ndjson` 支持回放与复现 bug（vibecoding 友好：可离线重现）

---

## 3. Monorepo 结构（SRP/OCP 友好，强解耦）

建议使用 pnpm workspace（或 npm workspace）：

* `packages/shared/`
  协议 types、zod schema 校验、WorkState reducer（无平台依赖）

* `packages/bridge-plugin/`
  OpenCode 插件：订阅事件 → 计算/归一化 → 写 state.json/ndjson

* `packages/game-core/`
  纯逻辑：战斗状态机、刷怪规则、任务系统、奖励结算（不依赖 Pixi/Electron）

* `packages/renderer-pixi/`
  渲染层：Pixi 视图、动画驱动、单位表现（依赖 PixiJS）

* `apps/desktop-electron/`
  Electron 主进程：托盘/窗口/文件监听/IPC；渲染进程加载 renderer-pixi

* `assets/packs/`
  默认素材包（可为空，便于跑 demo；用户可后续替换）

* `docs/`
  文档与配置模板

### SRP 落点

* shared：只管协议与校验
* plugin：只管从 OpenCode 事件到桥接文件
* core：只管规则与状态推进
* renderer：只管画面
* app：只管桌面能力（托盘、窗口、文件监听、持久化）

### OCP 落点

* 新增角色/敌人：只放素材 + 写配置，不改代码
* 新增规则：新增实现类（例如 ISpawnRule）并在配置引用，不改核心循环

---

## 4. 桥接协议设计（BridgeState v1）

### 4.1 输出目录（按项目 worktree 隔离）

固定写到：

* `<worktree>/.opencode/gamify/state.json`（覆盖写，桌面端主要读取）
* `<worktree>/.opencode/gamify/events.ndjson`（追加写，用于回放/调试）

插件上下文提供 `worktree`，可直接定位该目录。

### 4.2 BridgeState v1（建议字段）

* `v: 1`（协议版本）
* `updatedAt`（ISO 时间）
* `project.worktree`（路径）
* `session`（可为空）

  * `id`
  * `busy`（boolean）
  * `idle`（boolean）
  * `openTodos / doneTodos / totalTodos`（计数）
  * `conversationStartedAt / lastUserMessageAt / lastAssistantMessageAt`（仅时间戳，避免内容隐私）
* `counters`

  * `todosCompletedTotal`
  * `conversationsCompletedTotal`

### 4.3 NDJSON 事件（可选但强烈建议）

每行一个事件，便于回放：

* `bridge.session.started`
* `bridge.session.status`（busy/idle）
* `bridge.todo.snapshot`
* `bridge.todo.completedDelta`
* `bridge.conversation.completed`

---

## 5. OpenCode 插件实现（packages/bridge-plugin）

### 5.1 部署方式（CLI 场景）

* 插件文件放在：`.opencode/plugins/opencode-buddy-bridge.ts`
* 依赖声明放在：`.opencode/package.json`
  OpenCode 会在启动时对该 package.json 执行 `bun install`。

### 5.2 事件接入策略：集中 `event` hook 统一分发

推荐只实现一个 `event` 入口（减少散落逻辑，便于维护），在内部 switch 分发：

* 接收 OpenCode event
* Reduce → 更新内存 state
* 去抖/去重
* 写 `events.ndjson`（可选）
* 覆盖写 `state.json`

事件类型与命名来自官方事件列表。

### 5.3 Reducer 规则（MVP 稳定口径）

1. `session.created`

* 初始化 `session`，记录 `conversationStartedAt`
* busy=false、idle=false

2. `session.status`

* 将 OpenCode 状态映射为 `busy/idle`
* 建议：busy 表示“AI 输出中或工具执行中”；idle 表示“暂时停住等待”
  注意：idle 语义可能并不等价于完全结束，因此不要单独依赖 idle 判定“本轮完成”。

3. `session.idle`

* 设置 idle=true，busy=false
* 若 `openTodos==0`：判定“对话完成”→ `counters.conversationsCompletedTotal++`
  （组合判定：idle + openTodos==0）

4. `todo.updated`

* 计算 open/done/total
* 用 diff 计算 done 增量：`deltaDone = newDone - oldDone`
* 若 `deltaDone > 0`：`counters.todosCompletedTotal += deltaDone`

5. `message.updated`（可选）

* 只更新时间戳（user/assistant 方向）
* 不保存文本内容

### 5.4 去重/容错（必要）

* 事件可能重复触发或密集触发：对 `todo.updated` 使用“内容 hash”去重（例如对 todo 列表 `id+status` 排序后 hash）
* 写文件采取“先写临时文件再 rename 覆盖”或“覆盖写 + fsync”（取决于平台与库）
* 桌面端读取失败要容错（JSON 半写入时重试）

### 5.5 自动拉起桌面端（可选）

* 插件启动时判断桌面端是否在跑（lock 文件或本地 ping）
* 不在跑时使用 `$` 执行启动命令
  `$` 是 Bun shell API，插件可执行本地命令。

---

## 6. Desktop App（Electron 主路径）

### 6.1 进程职责（SRP）

Main Process：

* Tray（托盘）、窗口创建、置顶/透明度/无边框/拖拽
* 监听 `state.json` 变化并读取
* 通过 IPC 推送 BridgeState 给 Renderer
* 持久化 settings（窗口位置、透明度、静音等）

Renderer：

* PixiJS 渲染
* 调用 game-core 推进逻辑
* 加载 packs（素材与配置）
* Debug 面板（可选：显示 openTodos、busy、当前波次等）

### 6.2 文件监听

* 推荐 chokidar（跨平台稳）
* 监听多个工作区：允许用户在桌面端设置“当前关注的 worktree”，或自动从最近活动 worktree 切换（后续增强）

### 6.3 IPC 事件

* `bridge:state`（Main → Renderer）
* `ui:cmd`（Renderer → Main，例如切换置顶、透明度）

---

## 7. game-core：战斗、刷怪、任务系统（纯逻辑）

### 7.1 核心状态

* WorkState（由 BridgeState reducer 得到）

  * busy、idle、openTodos、doneTodos、totalTodos

* BattleState

  * heroes[]、enemies[]
  * aliveTarget（当前目标在场敌人数）
  * spawnCooldown、resolveTimer
  * phase：Dormant / SessionStart / Combat / ResolveTodo / Victory

* TaskState

  * todosCompletedTotal、conversationsCompletedTotal
  * claimedTaskIds（已领取奖励任务）

### 7.2 核心接口（OCP）

* ISpawnRule

  * computeAliveTarget(openTodos, totalTodos) → aliveTarget
  * pickEnemyId(rng, pool) → enemyId
  * respawnDelaySec(rng) → number

* IAttackPolicy

  * decideAction({ busy, rng }) → idle/attack/defend/work/special
  * special 概率、work 低频策略通过配置驱动

新增规则：新增实现类并在配置引用，不改 battle loop。

### 7.3 todo 完成反馈（ResolveTodo）

* 识别：doneTodos 增量或 openTodos 减少
* 行为：

  * 停止刷新
  * 快速处决当前在场敌人（动画序列由 renderer 实现）
  * 若 openTodos>0 回到 Combat，否则 Victory

---

## 8. renderer-pixi：PixiJS 动画与表现（纯表现层）

### 8.1 资产加载：按 packs 配置驱动

* 从 `packs/` 读取 hero/enemy JSON
* 从对应 anim 目录读取 PNG 序列
* 运行时构建 AnimatedSprite 或自定义帧播放器

### 8.2 UnitView SRP

* setAction(actionName)
* playOnce/loop
* hit flash / die fade（可选）
* 不参与“选目标/刷怪/结算”，这些属于 core

---

## 9. 内容管线：纯配置加角色/敌人（重点）

### 9.1 packs 目录规范（热插拔）

* `packs/heroes/<id>/hero.json`
* `packs/heroes/<id>/anim/<action>/*.png`
* `packs/enemies/<id>/enemy.json`
* `packs/enemies/<id>/anim/<action>/*.png`
* `packs/pools/enemy_pool.json`
* `packs/tasks/tasks.json`

### 9.2 配置最小字段（强简化）

hero.json 必需：

* id、displayName
* stats：hp/atk/def/spd
* special：chance、multiplier
* idleWork：chancePerSecondWhenBusy、minGapSeconds
* anims：idle/attack/defend/special（work 可选）

enemy.json 必需：

* id、displayName、tier
* stats：hp/atk/def/spd
* anims：idle/attack/die（hit 可选）

enemy_pool.json 必需：

* pools（按 tier 或任意分组）
* waveRules：baseAlive、alivePerTodo、respawnDelaySec[min,max]

tasks.json 必需：

* tasks[]：type（todosCompletedTotal / conversationsCompletedTotal）、threshold、reward.addHero

### 9.3 校验与 fallback（避免素材缺失导致崩）

* shared 包使用 zod 校验配置结构
* 缺失可选动画：

  * hero.work 缺失 → 复用 idle
  * enemy.hit 缺失 → 使用 idle + 闪白
* 加载失败仅忽略该条目，并在 debug 面板报告错误（不中断运行）

---

## 10. 本地持久化（桌面端）

需要持久化两类数据：

1. Settings（用户偏好）

* 窗口位置、大小
* 置顶、透明度、静音、暂停动画
* 当前关注 worktree

2. Progression（成长）

* counters（累计 todo 完成、累计对话完成）
* 已领取任务列表
* 当前队伍 roster（英雄 id 列表、最多 N 人）

Electron 推荐 `electron-store`；Tauri 对应 `tauri-plugin-store`。

---

## 11. 隐私与安全（默认最小化）

默认只同步：

* busy/idle
* open/done/total todo 计数
* 会话 id 与时间戳

默认不同步：

* 用户 prompt 文本
* AI 输出文本
* 文件内容

---

## 12. 开发与调试（vibecoding 必备）

### 12.1 回放工具（强烈建议）

* 输入：`events.ndjson`
* 输出：按时间顺序喂给 reducer + core
* 用途：复现“某次 todo 完成没有触发处决”等 bug

### 12.2 无 OpenCode 也能跑的 mock

* 桌面端提供 debug 开关：读取 `mock/state.mock.json`，每 2 秒变一次 openTodos/busy
* 渲染与规则可离线迭代

---

## 13. 里程碑（最小闭环推进）

### M1：桥接通

* 插件输出 state.json（busy/idle + todo 计数 + counters）
* Electron 监听并显示 debug 信息（数字即可）

### M2：战斗 MVP

* Pixi 渲染：剑士 + 敌人
* 刷怪：openTodos 映射 aliveTarget，未完成时无限刷新
* 完成 todo：ResolveTodo 处决清场
* 全部完成：Victory 庆祝

### M3：任务与奖励

* tasks.json 阈值结算
* 达成阈值 → 新增剑士（配置驱动）
* 特殊攻击 + work 低频动作（busy 时触发）

---

## 附：为何不强依赖 Server SSE（但保留升级口）

OpenCode server 提供 `/global/event` SSE，且 `opencode` 运行时采用 client/server 架构。
但 MVP 用文件桥接能显著降低端口/鉴权/多实例/跨项目协调复杂度，后续如果需要更实时或跨机器同步，再引入 SSE/Socket 作为增强通道。
