/**
 * GameConfig - 只读游戏配置类型
 * 
 * 所有字段使用 readonly 修饰，运行时不可修改。
 * 对应 Config/ 目录下的 JSON 文件。
 */

// ============================================================
// 基础类型
// ============================================================

/** 单位基础属性 */
export interface UnitStats {
  readonly hp: number;
  readonly atk: number;
  readonly def: number;
  readonly spd: number;
  readonly hpRegen?: number;
}

/** 技能配置 */
export interface SkillConfig {
  /** 技能触发概率 (0-1) */
  readonly chance: number;
  /** 技能伤害倍率 */
  readonly multiplier: number;
}

/** 恢复配置 */
export interface RecoveryConfig {
  /** 倒地恢复时长（秒） */
  readonly durationSec: number;
  /** 恢复动画播放间隔（秒） */
  readonly healIntervalSec: number;
}

/** 单个动画配置 */
export interface AnimConfig {
  /** 动画变体文件夹名列表（随机播放） */
  readonly variants: readonly string[];
  /** 帧率 */
  readonly fps: number;
  /** 是否循环播放 */
  readonly loop?: boolean;
}

/** 动画集合配置 */
export interface AnimsConfig {
  readonly idle: AnimConfig;
  readonly walk?: AnimConfig;
  readonly attack?: AnimConfig;
  readonly skill?: AnimConfig;
  readonly hit?: AnimConfig;
  readonly die?: AnimConfig;
  readonly heal?: AnimConfig;
  readonly defend?: AnimConfig;
}

// ============================================================
// GameParameters - 全局游戏参数
// ============================================================

export interface BattleParams {
  /** 技能触发概率 */
  readonly skillChance: number;
  /** 防御减伤比例 */
  readonly defendDamageReduction: number;
  /** 暴击伤害倍率 */
  readonly critMultiplier: number;
}

export interface RecoveryParams {
  /** 默认倒地恢复时长（秒） */
  readonly defaultDurationSec: number;
  /** 恢复动画播放间隔（秒） */
  readonly healIntervalSec: number;
  /** 每次恢复的 HP 百分比 */
  readonly hpRegenPercent: number;
}

export interface SpawnParams {
  /** 基础在场敌人数 */
  readonly baseAliveCount: number;
  /** 每个未完成 todo 增加的敌人数 */
  readonly alivePerTodo: number;
  /** 刷新延迟下限（秒） */
  readonly respawnDelayMin: number;
  /** 刷新延迟上限（秒） */
  readonly respawnDelayMax: number;
}

export interface WaveParams {
  /** 普通敌人权重 */
  readonly normalWeight: number;
  /** 精英敌人权重 */
  readonly eliteWeight: number;
  /** 稀有敌人权重 */
  readonly rareWeight: number;
}

export interface AnimationParams {
  /** 默认动画帧率 */
  readonly defaultFps: number;
  /** 受击闪白时长（秒） */
  readonly hitFlashDuration: number;
  /** 死亡淡出时长（秒） */
  readonly deathFadeDuration: number;
}

/** 全局游戏参数 */
export interface GameParameters {
  readonly battle: BattleParams;
  readonly recovery: RecoveryParams;
  readonly spawn: SpawnParams;
  readonly wave: WaveParams;
  readonly animation: AnimationParams;
}

// ============================================================
// CharacterConfig - 角色配置
// ============================================================

export interface CharacterConfig {
  readonly id: string;
  readonly displayName: string;
  readonly stats: UnitStats;
  readonly skill: SkillConfig;
  readonly recovery: RecoveryConfig;
  readonly anims: AnimsConfig;
  /** 素材路径（相对于项目根目录） */
  readonly assetPath: string;
}

// ============================================================
// EnemyConfig - 敌人配置
// ============================================================

export interface EnemyConfig {
  readonly id: string;
  readonly displayName: string;
  /** 敌人等级/层级 */
  readonly tier: number;
  readonly stats: UnitStats;
  readonly anims: AnimsConfig;
  /** 素材路径（相对于项目根目录） */
  readonly assetPath: string;
}

// ============================================================
// EnemyPools - 敌人概率池
// ============================================================

export interface EnemyPoolEntry {
  readonly id: string;
  readonly weight: number;
}

export interface EnemyPool {
  readonly enemies: readonly EnemyPoolEntry[];
}

export interface EnemyPools {
  readonly pools: Readonly<Record<string, EnemyPool>>;
  readonly defaultPool: string;
}

// ============================================================
// Tasks - 任务配置
// ============================================================

export type TaskType = 'todosCompletedTotal' | 'conversationsCompletedTotal';

export interface TaskReward {
  readonly addCharacter?: string;
}

export interface TaskConfig {
  readonly id: string;
  readonly type: TaskType;
  readonly threshold: number;
  readonly reward: TaskReward;
}

export interface TasksConfig {
  readonly tasks: readonly TaskConfig[];
}
