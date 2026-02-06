# MVP 任务拆分（OpenCode Buddy）

> 版本：v0.1 MVP  
> 创建时间：2026-02-05  
> 基于：DesignOverview.md + TechnicalStack.md

---

## 项目概述

OpenCode Buddy 是一个桌面挂机战斗小游戏，核心理念是将 OpenCode 的 todo/对话进度**可视化**为像素风格的战斗场景：

- **工作中** → 剑士们积极战斗、清怪
- **完成 todo** → 触发处决演出、清场
- **累计完成任务** → 奖励新剑士加入队伍

---

## MVP 范围边界

### ✅ MVP 必做

| 功能 | 说明 |
|------|------|
| 剑士 vs 敌人战斗 | 像素帧动画，自动挂机 |
| 波次敌人刷新 | 未完成 todo 时无限刷新 |
| todo 完成反馈 | ResolveTodo 处决演出 |
| 任务系统 | 累计 todo/对话 → 奖励新剑士 |
| 特殊攻击 | 8% 概率触发暴击/连击 |
| 忙/闲动作差异 | busy 时攻击多，idle 时防御多 |

### ❌ MVP 不做

- 职业变化、装备系统、技能树
- 复杂 UI（背包、任务面板）
- 强制通知/弹窗打断

---

## 技术架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenCode CLI (TUI)                       │
│                          ↓                                  │
│              bridge-plugin (订阅事件)                        │
│                          ↓                                  │
│         .opencode/gamify/state.json (文件桥接)               │
│                          ↓                                  │
│              Electron Main (文件监听)                        │
│                          ↓                                  │
│              Electron Renderer + PixiJS                     │
│                    ↙         ↘                              │
│              game-core      renderer-pixi                   │
│            (纯逻辑层)        (纯表现层)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 项目目录结构

```
OpenCodeMonsterArena/
│
├── ProjectOverview/                    ← 项目文档
│   ├── DesignOverview.md               ← 游戏设计概览
│   ├── TechnicalStack.md               ← 技术方案
│   └── MVP-TaskBreakdown.md            ← 任务拆分（本文件）
│
├── ArtAssets/                          ← 美术资源（详见素材格式规范）
│   ├── Character/                      ← 玩家角色
│   ├── Enemy/                          ← 敌人
│   ├── Effect/                         ← 特效
│   ├── Projectile/                     ← 投射物
│   └── Map/                            ← 地图背景
│
├── Config/                             ← 游戏配置（原数据表）
│   ├── GameParameters.json             ← 全局游戏参数
│   ├── CharacterConfig/                ← 角色配置（每角色一个文件）
│   │   └── <character_id>.json
│   ├── EnemyConfig/                    ← 敌人配置（每敌人一个文件）
│   │   └── <enemy_id>.json
│   ├── EnemyPools.json                 ← 敌人概率池配置
│   └── Tasks.json                      ← 任务与奖励配置
│
├── PlayerData/                         ← 玩家数据（运行时生成）
│   ├── Settings.json                   ← 用户设置
│   └── SaveData.json                   ← 玩家存档
│
├── packages/                           ← Monorepo 代码包
│   ├── shared/                         ← 共享协议与类型
│   │   ├── src/
│   │   │   ├── types/                  ← TypeScript 类型定义
│   │   │   │   ├── BridgeState.ts      ← 桥接状态协议
│   │   │   │   ├── WorkState.ts        ← 工作状态
│   │   │   │   ├── GameConfig.ts       ← 配置类型（只读）
│   │   │   │   └── PlayerData.ts       ← 玩家数据类型（可写）
│   │   │   ├── schemas/                ← Zod 校验 schema
│   │   │   │   ├── configSchemas.ts    ← 配置文件校验
│   │   │   │   └── playerDataSchemas.ts← 玩家数据校验
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── bridge-plugin/                  ← OpenCode 插件
│   │   ├── src/
│   │   │   └── opencode-buddy-bridge.ts
│   │   └── package.json
│   │
│   ├── game-core/                      ← 游戏逻辑（纯逻辑，无 UI 依赖）
│   │   ├── src/
│   │   │   ├── battle/                 ← 战斗系统
│   │   │   │   ├── BattleLoop.ts       ← 战斗主循环
│   │   │   │   ├── BattleState.ts      ← 战斗状态
│   │   │   │   ├── HeroState.ts        ← 角色状态机（Combat/Downed）
│   │   │   │   └── ActionPolicy.ts     ← 动作决策
│   │   │   ├── spawn/                  ← 刷怪系统
│   │   │   │   ├── SpawnRule.ts        ← 刷怪规则接口
│   │   │   │   └── DefaultSpawnRule.ts ← 默认刷怪实现
│   │   │   ├── task/                   ← 任务系统
│   │   │   │   └── TaskManager.ts      ← 任务管理器
│   │   │   ├── config/                 ← 配置加载
│   │   │   │   └── ConfigLoader.ts     ← 配置文件加载器
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── renderer-pixi/                  ← PixiJS 渲染层
│       ├── src/
│       │   ├── AssetLoader.ts          ← 素材加载器
│       │   ├── UnitView.ts             ← 单位视图
│       │   ├── BattleScene.ts          ← 战斗场景
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   └── desktop-electron/               ← Electron 桌面应用
│       ├── src/
│       │   ├── main/                   ← 主进程
│       │   │   ├── main.ts             ← 入口
│       │   │   ├── tray.ts             ← 托盘菜单
│       │   │   ├── fileWatcher.ts      ← state.json 监听
│       │   │   └── dataManager.ts      ← PlayerData 读写
│       │   └── renderer/               ← 渲染进程
│       │       └── index.ts
│       └── package.json
│
├── pnpm-workspace.yaml                 ← Monorepo 配置
└── package.json
```

---

## Config 配置文件规范

### 设计原则

1. **只读配置**：`Config/` 目录下的文件为**只读原数据表**，游戏运行时不会修改
2. **可写数据**：`PlayerData/` 目录下的文件为**玩家数据**，运行时会读写
3. **类型分离**：TypeScript 类型定义中明确区分 `GameConfig`（只读）和 `PlayerData`（可写）

### GameParameters.json（全局游戏参数）

```json
{
  "$schema": "./schemas/GameParameters.schema.json",
  "$comment": "全局游戏参数配置",
  
  "battle": {
    "skillChance": 0.08,              // 技能触发概率
    "defendDamageReduction": 0.5,     // 防御减伤比例
    "critMultiplier": 2.5             // 暴击伤害倍率
  },
  
  "recovery": {
    "defaultDurationSec": 20,         // 倒地恢复时长（秒）
    "healIntervalSec": 2,             // 恢复动画播放间隔
    "hpRegenPercent": 0.05            // 每次恢复的 HP 百分比
  },
  
  "spawn": {
    "baseAliveCount": 2,              // 基础在场敌人数
    "alivePerTodo": 1,                // 每个未完成 todo 增加的敌人数
    "respawnDelayMin": 0.8,           // 刷新延迟下限（秒）
    "respawnDelayMax": 1.6            // 刷新延迟上限（秒）
  },
  
  "wave": {
    "normalWeight": 80,               // 普通敌人权重
    "eliteWeight": 18,                // 精英敌人权重
    "rareWeight": 2                   // 稀有敌人权重
  },
  
  "animation": {
    "defaultFps": 8,                  // 默认动画帧率
    "hitFlashDuration": 0.1,          // 受击闪白时长（秒）
    "deathFadeDuration": 0.5          // 死亡淡出时长（秒）
  }
}
```

### CharacterConfig/\<id\>.json（角色配置）

存放路径：`Config/CharacterConfig/<character_id>.json`

```json
{
  "$schema": "../schemas/Character.schema.json",
  "$comment": "角色配置文件",
  
  "id": "soldier",
  "displayName": "士兵",
  
  "stats": {
    "hp": 100,
    "atk": 15,
    "def": 5,
    "spd": 1.0,
    "hpRegen": 5
  },
  
  "skill": {
    "chance": 0.08,
    "multiplier": 2.5
  },
  
  "recovery": {
    "durationSec": 20,
    "healIntervalSec": 2
  },
  
  "anims": {
    "idle":   { "variants": ["Idle"], "fps": 8, "loop": true },
    "walk":   { "variants": ["Walk"], "fps": 10, "loop": true },
    "attack": { "variants": ["Attack01", "Attack02"], "fps": 12 },
    "skill":  { "variants": ["Skill01"], "fps": 12 },
    "hit":    { "variants": ["Hit"], "fps": 10 },
    "die":    { "variants": ["Die"], "fps": 8 },
    "heal":   { "variants": ["Heal"], "fps": 6, "loop": true },
    "defend": { "variants": ["Defend"], "fps": 10 }
  },
  
  "assetPath": "ArtAssets/Character/Soldier"
}
```

### EnemyConfig/\<id\>.json（敌人配置）

存放路径：`Config/EnemyConfig/<enemy_id>.json`

```json
{
  "$schema": "../schemas/Enemy.schema.json",
  "$comment": "敌人配置文件",
  
  "id": "orc",
  "displayName": "兽人",
  "tier": 1,
  
  "stats": {
    "hp": 50,
    "atk": 10,
    "def": 3,
    "spd": 0.9
  },
  
  "anims": {
    "idle":   { "variants": ["Idle"], "fps": 6, "loop": true },
    "walk":   { "variants": ["Walk"], "fps": 8, "loop": true },
    "attack": { "variants": ["Attack01", "Attack02"], "fps": 10 },
    "hit":    { "variants": ["Hit"], "fps": 10 },
    "die":    { "variants": ["Die"], "fps": 8 }
  },
  
  "assetPath": "ArtAssets/Enemy/Orc"
}
```

### EnemyPools.json（敌人概率池）

```json
{
  "$schema": "./schemas/EnemyPools.schema.json",
  "$comment": "敌人概率池配置",
  
  "pools": {
    "tier1": {
      "enemies": [
        { "id": "orc", "weight": 50 },
        { "id": "slime", "weight": 30 },
        { "id": "bat", "weight": 20 }
      ]
    },
    "tier2": {
      "enemies": [
        { "id": "skeleton", "weight": 40 },
        { "id": "goblin", "weight": 60 }
      ]
    }
  },
  
  "defaultPool": "tier1"
}
```

### Tasks.json（任务配置）

```json
{
  "$schema": "./schemas/Tasks.schema.json",
  "$comment": "任务与奖励配置",
  
  "tasks": [
    {
      "id": "todo_5",
      "type": "todosCompletedTotal",
      "threshold": 5,
      "reward": { "addCharacter": "soldier" }
    },
    {
      "id": "todo_15",
      "type": "todosCompletedTotal",
      "threshold": 15,
      "reward": { "addCharacter": "knight" }
    },
    {
      "id": "conv_3",
      "type": "conversationsCompletedTotal",
      "threshold": 3,
      "reward": { "addCharacter": "archer" }
    }
  ]
}
```

---

## PlayerData 玩家数据规范

### 设计原则

1. **运行时生成**：首次启动时自动创建默认文件
2. **原子写入**：先写临时文件再 rename，避免写入失败导致数据损坏
3. **版本迁移**：包含 `version` 字段，支持后续数据结构升级迁移

### Settings.json（用户设置）

存放路径：`PlayerData/Settings.json`

```json
{
  "$schema": "./schemas/Settings.schema.json",
  "version": 1,
  
  "window": {
    "width": 360,
    "height": 220,
    "x": 100,
    "y": 100,
    "alwaysOnTop": true,
    "opacity": 1.0
  },
  
  "audio": {
    "muted": false,
    "volume": 0.8
  },
  
  "gameplay": {
    "animationPaused": false,
    "battleSpeed": 1.0
  },
  
  "debug": {
    "showDebugPanel": false,
    "mockMode": false
  },
  
  "currentWorktree": null
}
```

### SaveData.json（玩家存档）

存放路径：`PlayerData/SaveData.json`

```json
{
  "$schema": "./schemas/SaveData.schema.json",
  "version": 1,
  "lastSavedAt": "2026-02-06T00:45:00Z",
  
  "counters": {
    "todosCompletedTotal": 42,
    "conversationsCompletedTotal": 8
  },
  
  "tasks": {
    "claimedIds": ["todo_5", "conv_3"]
  },
  
  "roster": {
    "characters": ["soldier", "knight"],
    "maxSize": 6
  },
  
  "characterStates": {
    "soldier": {
      "hp": 100,
      "maxHp": 100,
      "state": "Combat"
    },
    "knight": {
      "hp": 80,
      "maxHp": 120,
      "state": "Downed",
      "downtimeRemaining": 12.5
    }
  }
}
```

---

## 类型定义架构（packages/shared）

### GameConfig.ts（只读配置类型）

```typescript
// packages/shared/src/types/GameConfig.ts

/** 只读游戏配置类型 - 所有字段为 readonly */

export interface GameParameters {
  readonly battle: {
    readonly skillChance: number;
    readonly defendDamageReduction: number;
    readonly critMultiplier: number;
  };
  readonly recovery: {
    readonly defaultDurationSec: number;
    readonly healIntervalSec: number;
    readonly hpRegenPercent: number;
  };
  readonly spawn: {
    readonly baseAliveCount: number;
    readonly alivePerTodo: number;
    readonly respawnDelayMin: number;
    readonly respawnDelayMax: number;
  };
  // ... 其他配置
}

export interface CharacterConfig {
  readonly id: string;
  readonly displayName: string;
  readonly stats: Readonly<UnitStats>;
  readonly skill: Readonly<SkillConfig>;
  readonly recovery: Readonly<RecoveryConfig>;
  readonly anims: Readonly<AnimsConfig>;
  readonly assetPath: string;
}

export interface EnemyConfig {
  readonly id: string;
  readonly displayName: string;
  readonly tier: number;
  readonly stats: Readonly<UnitStats>;
  readonly anims: Readonly<AnimsConfig>;
  readonly assetPath: string;
}
```

### PlayerData.ts（可写玩家数据类型）

```typescript
// packages/shared/src/types/PlayerData.ts

/** 可写玩家数据类型 - 字段可变 */

export interface Settings {
  version: number;
  window: WindowSettings;
  audio: AudioSettings;
  gameplay: GameplaySettings;
  debug: DebugSettings;
  currentWorktree: string | null;
}

export interface SaveData {
  version: number;
  lastSavedAt: string;
  counters: {
    todosCompletedTotal: number;
    conversationsCompletedTotal: number;
  };
  tasks: {
    claimedIds: string[];
  };
  roster: {
    characters: string[];
    maxSize: number;
  };
  characterStates: Record<string, CharacterState>;
}

export interface CharacterState {
  hp: number;
  maxHp: number;
  state: 'Combat' | 'Downed';
  downtimeRemaining?: number;  // 仅 Downed 状态有效
}
```

---

## 素材格式规范

素材统一存放在 `ArtAssets/` 目录，采用**文件夹即动画**的设计，支持**动画变体随机播放**。

### 素材目录结构

```
ArtAssets/
├── Character/                      ← 玩家角色
│   └── Soldier/                    ← 角色 ID（文件夹名）
│       ├── character.json          ← 角色配置
│       │
│       ├── Idle/                   ← 动画文件夹（二选一）
│       │   └── *.png               ← 序列帧：任意命名，按字母序读取
│       │   └── spritesheet.png     ← 或 Spritesheet：单张图集
│       │   └── spritesheet.json    ← Spritesheet 描述文件
│       │
│       ├── Walk/
│       ├── Attack01/               ← 攻击变体1
│       ├── Attack02/               ← 攻击变体2
│       ├── Skill01/                ← 技能变体
│       ├── Hit/
│       ├── Die/
│       ├── Heal/                   ← 恢复动作
│       └── Defend/
│
├── Enemy/                          ← 敌人
│   └── Orc/
│       ├── enemy.json
│       ├── Idle/
│       ├── Walk/
│       ├── Attack01/
│       ├── Attack02/
│       ├── Hit/
│       └── Die/
│
├── Effect/                         ← 特效
├── Projectile/                     ← 投射物
└── Map/                            ← 地图背景
```

### 核心设计

#### 1. 文件夹即动画

- 每个**文件夹**代表一个完整动画
- 文件夹内支持两种格式（二选一）：
  - **序列帧**：多个 PNG 文件，按字母序读取拼成帧序列
  - **Spritesheet**：`spritesheet.png` + `spritesheet.json`（PixiJS 格式）
- **多变体**：同一动作可配置多个文件夹，触发时随机选择

#### 2. 动画与逻辑分离

> **重要设计原则**：游戏中人物的**动作逻辑**与**动画播放**是拆分开的。

- 动画仅为视觉表现，不影响动作的实际效果
- 动作效果（伤害、治疗等）由 game-core 逻辑层独立计算
- 动画播放失败或缺失不会阻断游戏逻辑

#### 3. 动画缺失 Fallback

- 当 JSON 中配置的动作缺失对应动画时，**统一使用 `idle` 替代**
- 例如：角色没有 `defend` 动画 → 播放 `idle` 动画，但防御效果正常生效

---

### 完整动作集定义

角色（Character）和敌人（Enemy）共享以下动作集：

| 动作 | 说明 | 是否必需 |
|------|------|----------|
| `idle` | 待机循环 | ✅ 必需 |
| `walk` | 移动 | 可选（缺失用 idle） |
| `attack` | 普通攻击 | 可选（支持多变体） |
| `skill` | 技能攻击（原 special） | 可选（支持多变体） |
| `hit` | 受击反馈 | 可选（缺失用闪白 + idle） |
| `die` | 死亡倒地 | 可选（缺失用淡出） |
| `heal` | 恢复动作 | 可选（倒地恢复时播放） |
| `defend` | 格挡/防御 | 可选（缺失用 idle） |

---

### 角色恢复机制

> **MVP 核心机制**：角色死亡后不会消失，而是进入倒地恢复状态。

```
┌─────────┐    HP=0     ┌─────────┐   20秒后    ┌─────────┐
│ Combat  │ ─────────→ │ Downed  │ ──────────→ │ Combat  │
│ (战斗中) │            │ (倒地中) │  HP恢复满   │ (重新战斗)│
└─────────┘            └─────────┘             └─────────┘
                            ↓
                      播放 die 动画
                      进入倒地状态
                      20秒内播放 heal 动画
                      HP 逐渐恢复
```

- **倒地时长**：默认 20 秒（可配置：`recoveryDurationSec`）
- **恢复过程**：倒地期间周期性播放 `heal` 动画，HP 逐渐回满
- **重新战斗**：HP 恢复满后自动站起，重新加入战斗

---

### 角色配置示例 (`character.json`)

```json
{
  "id": "soldier",
  "displayName": "士兵",
  "stats": {
    "hp": 100,
    "atk": 15,
    "def": 5,
    "spd": 1.0,
    "hpRegen": 5
  },
  "skill": { "chance": 0.08, "multiplier": 2.5 },
  "recovery": {
    "durationSec": 20,
    "healIntervalSec": 2
  },
  "anims": {
    "idle":   { "variants": ["Idle"], "fps": 8, "loop": true },
    "walk":   { "variants": ["Walk"], "fps": 10, "loop": true },
    "attack": { "variants": ["Attack01", "Attack02"], "fps": 12 },
    "skill":  { "variants": ["Skill01"], "fps": 12 },
    "hit":    { "variants": ["Hit"], "fps": 10 },
    "die":    { "variants": ["Die"], "fps": 8 },
    "heal":   { "variants": ["Heal"], "fps": 6, "loop": true },
    "defend": { "variants": ["Defend"], "fps": 10 }
  }
}
```

**播放逻辑**：触发 `attack` 动作时，从 `["Attack01", "Attack02"]` 随机选一个文件夹播放。

### 敌人配置示例 (`enemy.json`)

```json
{
  "id": "orc",
  "displayName": "兽人",
  "tier": 1,
  "stats": { "hp": 50, "atk": 10, "def": 3, "spd": 0.9 },
  "anims": {
    "idle":   { "variants": ["Idle"], "fps": 6, "loop": true },
    "walk":   { "variants": ["Walk"], "fps": 8, "loop": true },
    "attack": { "variants": ["Attack01", "Attack02"], "fps": 10 },
    "hit":    { "variants": ["Hit"], "fps": 10 },
    "die":    { "variants": ["Die"], "fps": 8 }
  }
}
```

> **注意**：敌人死亡后直接消失（不恢复），因此不需要 `heal` 动作。

---

### 加载器识别逻辑

```typescript
async function loadAnimVariant(variantPath: string): Promise<AnimFrames> {
  // 检查文件夹内是否存在 spritesheet
  const sheetPath = `${variantPath}/spritesheet.json`;
  if (await exists(sheetPath)) {
    return loadFromSpritesheet(variantPath);
  }
  // 否则读取序列帧 PNG
  return loadFromPngSequence(variantPath);
}

function loadFromPngSequence(folderPath: string): AnimFrames {
  const pngs = await readDir(folderPath, '*.png');
  // 按字母序排序后构建动画
  pngs.sort();
  return pngs.map(png => loadTexture(png));
}

function getAnimForAction(config: AnimsConfig, action: string): AnimDef {
  // 缺失动画 fallback 到 idle
  return config.anims[action] ?? config.anims['idle'];
}
```

### 设计优势

| 对比点 | 旧方案 | 新方案 ✅ |
|--------|--------|-----------|
| **Spritesheet 位置** | 根目录散落 | 放入动画文件夹，统一管理 |
| **动作集** | 不完整 | 8 种标准动作 |
| **动画缺失** | 可能报错 | 统一 fallback 到 idle |
| **逻辑与动画** | 耦合 | 完全分离 |
| **死亡处理** | 角色消失 | 倒地恢复机制 |


---

## 里程碑划分

| 里程碑 | 名称 | 核心目标 |
|--------|------|----------|
| **M1** | 桥接通 | 插件输出 state.json，Electron 能读取并显示 |
| **M2** | 战斗 MVP | Pixi 渲染战斗，todo 驱动刷怪与处决 |
| **M3** | 任务与奖励 | 任务阈值结算，新增剑士，特殊攻击 |

---

## M1：桥接通（基础通信链路）

### 目标
验证 OpenCode 插件 → 文件桥接 → Electron 的数据链路完整可用。

### 子任务

#### 1.1 初始化项目结构
- [ ] 创建 pnpm workspace 配置 (`pnpm-workspace.yaml`)
- [ ] 创建 `packages/shared/` 目录，配置 TypeScript
- [ ] 创建 `packages/bridge-plugin/` 目录
- [ ] 创建 `packages/game-core/` 目录
- [ ] 创建 `packages/renderer-pixi/` 目录
- [ ] 创建 `apps/desktop-electron/` 目录
- [ ] 创建 `Config/` 目录结构：
  - `Config/GameParameters.json`
  - `Config/CharacterConfig/`
  - `Config/EnemyConfig/`
  - `Config/EnemyPools.json`
  - `Config/Tasks.json`
- [ ] 创建 `PlayerData/` 目录（运行时生成，初始移动默认文件）
- [ ] 创建 `ArtAssets/` 目录结构（详见素材格式规范）

#### 1.2 定义 BridgeState 协议（packages/shared）
- [ ] 创建 `BridgeState` TypeScript 类型定义
  ```typescript
  interface BridgeState {
    v: 1;
    updatedAt: string; // ISO 时间
    project: { worktree: string };
    session: {
      id: string;
      busy: boolean;
      idle: boolean;
      openTodos: number;
      doneTodos: number;
      totalTodos: number;
      conversationStartedAt: string;
      lastUserMessageAt?: string;
      lastAssistantMessageAt?: string;
    } | null;
    counters: {
      todosCompletedTotal: number;
      conversationsCompletedTotal: number;
    };
  }
  ```
- [ ] 使用 Zod 创建 schema 校验
- [ ] 编写单元测试验证 schema

#### 1.3 定义配置与玩家数据类型（packages/shared）
- [ ] 创建 `types/GameConfig.ts`（只读配置类型）
  - `GameParameters`、`CharacterConfig`、`EnemyConfig` 等
  - 所有字段使用 `readonly` 修饰
- [ ] 创建 `types/PlayerData.ts`（可写玩家数据类型）
  - `Settings`、`SaveData`、`CharacterState` 等
  - 字段可变，支持运行时读写
- [ ] 创建 `schemas/configSchemas.ts`（配置文件 Zod 校验）
- [ ] 创建 `schemas/playerDataSchemas.ts`（玩家数据 Zod 校验）

#### 1.4 实现 OpenCode 插件（packages/bridge-plugin）
- [ ] 创建插件入口文件 `opencode-buddy-bridge.ts`
- [ ] 实现 `event` hook 统一入口
- [ ] 实现事件分发逻辑：
  - [ ] `session.created` → 初始化 session
  - [ ] `session.status` → 更新 busy/idle
  - [ ] `session.idle` → 判定对话完成
  - [ ] `todo.updated` → 计算 todo 计数与增量
- [ ] 实现 BridgeState reducer
- [ ] 实现 state.json 覆盖写（原子写入）
- [ ] 实现 events.ndjson 追加写（可选）
- [ ] 添加去重/去抖逻辑

#### 1.5 创建 Electron 应用骨架（apps/desktop-electron）
- [ ] 初始化 Electron + Vite 项目
- [ ] 配置无边框透明窗口
- [ ] 实现托盘菜单（显示/隐藏、退出）
- [ ] 使用 chokidar 监听 `state.json`
- [ ] 实现 IPC 将 BridgeState 推送到 Renderer
- [ ] 实现 `dataManager.ts`（PlayerData 读写管理器）
  - 首次启动生成默认 Settings.json 和 SaveData.json
  - 原子写入（先写临时文件再 rename）
- [ ] Renderer 显示 Debug 信息面板（纯文本显示 todo 计数、busy 状态）

#### 1.6 M1 验收测试

- [ ] 手动启动 OpenCode，触发 todo 变化
- [ ] 确认 Electron 窗口实时显示正确的 todo 计数
- [ ] 确认 busy/idle 状态同步

---

## M2：战斗 MVP（核心战斗循环）

### 目标
实现完整的挂机战斗循环，todo 驱动敌人刷新与处决演出。

### 子任务

#### 2.1 实现 WorkState Reducer（packages/shared）
- [ ] 从 BridgeState 提取 WorkState
  ```typescript
  interface WorkState {
    busy: boolean;
    idle: boolean;
    openTodos: number;
    doneTodos: number;
    totalTodos: number;
  }
  ```
- [ ] 实现 diff 检测（识别 doneTodos 增量）

#### 2.2 实现战斗状态机（packages/game-core）
- [ ] 定义 BattlePhase 枚举
  ```typescript
  enum BattlePhase {
    Dormant,      // 未检测到会话
    SessionStart, // 会话开始，入场演出
    Combat,       // 战斗循环
    ResolveTodo,  // 处决清场
    Victory       // 胜利庆祝
  }
  ```
- [ ] 定义 BattleState 结构
- [ ] 实现状态转换逻辑
- [ ] 编写状态机单元测试

#### 2.3 实现刷怪规则（packages/game-core）
- [ ] 定义 `ISpawnRule` 接口
- [ ] 实现默认刷怪规则：
  - `aliveTarget = baseAlive(2) + openTodos * alivePerTodo(1)`
  - `respawnDelay ∈ [0.8s, 1.6s]`
- [ ] 定义敌人概率池结构
- [ ] 实现 `pickEnemyId` 权重抽取

#### 2.4 实现动作决策（packages/game-core）
- [ ] 定义 `IActionPolicy` 接口
- [ ] 定义标准动作类型：
  - `idle` / `walk` / `attack` / `skill` / `hit` / `die` / `heal` / `defend`
- [ ] 实现基于 busy/idle 的权重调整
- [ ] 实现 skill 8% 概率触发
- [ ] 动画与逻辑分离：动作效果独立于动画播放
- [ ] 编写决策逻辑单元测试

#### 2.5 实现战斗循环（packages/game-core）
- [ ] 实现 `BattleLoop.tick(dt, workState)` 主循环
- [ ] 集成刷怪规则
- [ ] 集成动作决策
- [ ] 实现伤害计算与单位死亡
- [ ] 实现 ResolveTodo 处决逻辑（快速清场）

#### 2.6 实现角色恢复机制（packages/game-core）
- [ ] 定义角色状态机：
  ```typescript
  enum HeroState {
    Combat,   // 战斗中
    Downed,   // 倒地恢复中
  }
  ```
- [ ] 实现倒地逻辑：
  - HP 归零时进入 Downed 状态
  - 播放 `die` 动画
  - 启动恢复计时器（默认 20 秒）
- [ ] 实现恢复逻辑：
  - 周期性播放 `heal` 动画
  - HP 逐渐回满
  - 时间到或 HP 完全恢复，返回 Combat 状态
- [ ] Downed 状态的角色不参与战斗（不攻击、不受击）
- [ ] 编写恢复机制单元测试

#### 2.7 准备测试素材（ArtAssets）
- [ ] 在 `ArtAssets/Character/Soldier/` 下准备素材
  - 必需：`Idle/`
  - 可选：`Walk/`, `Attack01/`, `Attack02/`, `Skill01/`, `Hit/`, `Die/`, `Heal/`, `Defend/`
  - 每个文件夹内放序列帧 PNG 或 `spritesheet.png` + `spritesheet.json`
- [ ] 在 `ArtAssets/Enemy/Orc/` 下准备素材
  - 必需：`Idle/`
  - 可选：`Walk/`, `Attack01/`, `Attack02/`, `Hit/`, `Die/`
- [ ] 创建 `ArtAssets/Character/Soldier/character.json` 配置
  - 包含 `anims`、`stats`、`skill`、`recovery` 字段
- [ ] 创建 `ArtAssets/Enemy/Orc/enemy.json` 配置
- [ ] 创建 `ArtAssets/pools/enemy_pool.json` 配置

#### 2.8 实现 PixiJS 渲染层（packages/renderer-pixi）
- [ ] 初始化 PixiJS Application
- [ ] 实现素材加载器
  - [ ] 解析 `character.json` / `enemy.json` 的 `anims.variants` 字段
  - [ ] 文件夹模式：读取序列帧 PNG 按字母序构建动画
  - [ ] Spritesheet 模式：检测文件夹内 `spritesheet.json` 存在则优先使用
  - [ ] 动画缺失 Fallback：缺失动作统一用 `idle` 替代
  - [ ] 使用 Zod 校验配置结构
- [ ] 实现动画变体随机选择逻辑
  - [ ] 触发动作时从 `variants` 数组随机选一个变体播放
- [ ] 实现 `UnitView` 类
  - [ ] `setAction(actionName)` 切换动画（支持变体随机）
  - [ ] 帧动画播放（loop / playOnce）
  - [ ] 受击闪白效果
  - [ ] 死亡/倒地状态渲染
  - [ ] 恢复中 heal 动画周期播放
- [ ] 实现 `BattleScene` 管理所有单位视图
- [ ] 集成 game-core，驱动视图更新（动画与逻辑分离）

#### 2.9 集成到 Electron（apps/desktop-electron）
- [ ] Renderer 进程加载 renderer-pixi
- [ ] 接收 IPC 的 BridgeState 更新
- [ ] 驱动 game-core 的 BattleLoop
- [ ] 实现窗口拖拽

#### 2.10 M2 验收测试
- [ ] 启动后剑士进入 idle 状态
- [ ] OpenCode 产生 todo 后，敌人开始刷新
- [ ] 战斗自动进行，敌人死亡后继续刷新
- [ ] 剑士 HP 归零 → 倒地进入 Downed 状态
- [ ] 20秒后剑士恢复 HP 并站起重新战斗
- [ ] 缺失动画时自动 fallback 到 idle
- [ ] 完成一个 todo → 触发 ResolveTodo 清场
- [ ] 所有 todo 完成 → Victory 庆祝动画

---

## M3：任务与奖励（长期成长）

### 目标
实现任务系统，累计完成目标后奖励新剑士。

### 子任务

#### 3.1 实现任务系统（packages/game-core）
- [ ] 定义 TaskState 结构
  ```typescript
  interface TaskState {
    todosCompletedTotal: number;
    conversationsCompletedTotal: number;
    claimedTaskIds: string[];
    roster: string[]; // 当前队伍英雄 id 列表
  }
  ```
- [ ] 实现任务配置加载（从 tasks.json）
- [ ] 实现阈值检测与奖励结算
- [ ] 实现队伍人数上限（默认 6）

#### 3.2 准备任务配置（assets/packs）
- [ ] 创建 `tasks/tasks.json`
  ```json
  {
    "tasks": [
      { "id": "todo_5", "type": "todosCompletedTotal", "threshold": 5, "reward": { "addHero": "default" } },
      { "id": "conv_3", "type": "conversationsCompletedTotal", "threshold": 3, "reward": { "addHero": "default" } }
    ]
  }
  ```

#### 3.3 实现新剑士入场演出（packages/renderer-pixi）
- [ ] 实现新英雄入场动画（1s 内完成）
- [ ] 支持队伍多单位渲染与排列

#### 3.4 实现本地持久化（apps/desktop-electron）
- [ ] 使用 electron-store 保存 Settings
  - 窗口位置、大小
  - 置顶、透明度、静音
  - 当前关注 worktree
- [ ] 持久化 Progression
  - counters（累计 todo/对话完成）
  - 已领取任务列表
  - 当前队伍 roster

#### 3.5 实现 work 动作（packages/renderer-pixi）
- [ ] 剑士在 busy 时低频触发 work 动画
- [ ] 配置驱动：`chancePerSecondWhenBusy`、`minGapSeconds`

#### 3.6 完善托盘菜单（apps/desktop-electron）
- [ ] 暂停/继续动画
- [ ] 置顶切换
- [ ] 静音切换
- [ ] 透明度调节（0~100）

#### 3.7 实现 Mock 调试模式
- [ ] 支持读取 `mock/state.mock.json`
- [ ] 每 2 秒随机变化 openTodos/busy
- [ ] 无需 OpenCode 也能独立调试

#### 3.8 M3 验收测试
- [ ] 累计完成 5 个 todo → 奖励新剑士，队伍变为 2 人
- [ ] 新剑士入场有演出动画
- [ ] 关闭重开后，队伍人数保持不变（持久化生效）
- [ ] busy 时剑士偶发 work 动画
- [ ] 托盘菜单功能正常

---

## 验收标准（MVP Definition of Done）

1. ✅ 启动 OpenCode 后桌面挂件能自动进入 SessionStart/Combat
2. ✅ todo 未完成时，敌人会持续刷新，战斗循环稳定
3. ✅ 完成一个 todo 时能触发 ResolveTodo 的清场演出
4. ✅ 全部 todo 完成或会话结束时进入 Victory 并庆祝
5. ✅ 任务阈值达成后新增剑士，队伍人数变化可见
6. ✅ 新增剑士/敌人可通过"放素材+写配置"完成，无需改代码

---

## 技术债务与后续优化（非 MVP）

- [ ] SSE 实时通道替代文件轮询
- [ ] 多 worktree 同时监控
- [ ] 剑士皮肤池随机抽取
- [ ] 更丰富的敌人池与精英/稀有机制
- [ ] 音效系统
- [ ] Tauri 替代 Electron（减小包体积）
