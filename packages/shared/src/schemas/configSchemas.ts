/**
 * Zod Schemas for Game Config validation
 */
import { z } from 'zod';

// ============================================================
// 基础 Schemas
// ============================================================

export const UnitStatsSchema = z.object({
  hp: z.number().positive(),
  atk: z.number().nonnegative(),
  def: z.number().nonnegative(),
  spd: z.number().positive(),
  hpRegen: z.number().nonnegative().optional(),
});

export const SkillConfigSchema = z.object({
  chance: z.number().min(0).max(1),
  multiplier: z.number().positive(),
});

export const RecoveryConfigSchema = z.object({
  durationSec: z.number().positive(),
  healIntervalSec: z.number().positive(),
});

export const AnimConfigSchema = z.object({
  variants: z.array(z.string()).min(1),
  fps: z.number().int().positive(),
  loop: z.boolean().optional(),
});

export const AnimsConfigSchema = z.object({
  idle: AnimConfigSchema,
  walk: AnimConfigSchema.optional(),
  attack: AnimConfigSchema.optional(),
  skill: AnimConfigSchema.optional(),
  hit: AnimConfigSchema.optional(),
  die: AnimConfigSchema.optional(),
  heal: AnimConfigSchema.optional(),
  defend: AnimConfigSchema.optional(),
});

// ============================================================
// GameParameters Schema
// ============================================================

export const GameParametersSchema = z.object({
  battle: z.object({
    skillChance: z.number().min(0).max(1),
    defendDamageReduction: z.number().min(0).max(1),
    critMultiplier: z.number().positive(),
  }),
  recovery: z.object({
    defaultDurationSec: z.number().positive(),
    healIntervalSec: z.number().positive(),
    hpRegenPercent: z.number().min(0).max(1),
  }),
  spawn: z.object({
    baseAliveCount: z.number().int().positive(),
    alivePerTodo: z.number().int().nonnegative(),
    respawnDelayMin: z.number().nonnegative(),
    respawnDelayMax: z.number().positive(),
  }),
  wave: z.object({
    normalWeight: z.number().nonnegative(),
    eliteWeight: z.number().nonnegative(),
    rareWeight: z.number().nonnegative(),
  }),
  animation: z.object({
    defaultFps: z.number().int().positive(),
    hitFlashDuration: z.number().nonnegative(),
    deathFadeDuration: z.number().nonnegative(),
  }),
});

// ============================================================
// CharacterConfig Schema
// ============================================================

export const CharacterConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  stats: UnitStatsSchema,
  skill: SkillConfigSchema,
  recovery: RecoveryConfigSchema,
  anims: AnimsConfigSchema,
  assetPath: z.string(),
});

// ============================================================
// EnemyConfig Schema
// ============================================================

export const EnemyConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
  tier: z.number().int().positive(),
  stats: UnitStatsSchema,
  anims: AnimsConfigSchema,
  assetPath: z.string(),
});

// ============================================================
// EnemyPools Schema
// ============================================================

export const EnemyPoolEntrySchema = z.object({
  id: z.string().min(1),
  weight: z.number().positive(),
});

export const EnemyPoolsSchema = z.object({
  pools: z.record(z.object({
    enemies: z.array(EnemyPoolEntrySchema).min(1),
  })),
  defaultPool: z.string().min(1),
});

// ============================================================
// Tasks Schema
// ============================================================

export const TaskTypeSchema = z.enum(['todosCompletedTotal', 'conversationsCompletedTotal']);

export const TaskRewardSchema = z.object({
  addCharacter: z.string().optional(),
});

export const TaskConfigSchema = z.object({
  id: z.string().min(1),
  type: TaskTypeSchema,
  threshold: z.number().int().positive(),
  reward: TaskRewardSchema,
});

export const TasksConfigSchema = z.object({
  tasks: z.array(TaskConfigSchema),
});

// ============================================================
// PlayerData Schemas
// ============================================================

export const SettingsSchema = z.object({
  version: z.number().int().positive(),
  window: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    x: z.number().int(),
    y: z.number().int(),
    alwaysOnTop: z.boolean(),
    opacity: z.number().min(0).max(1),
  }),
  audio: z.object({
    muted: z.boolean(),
    volume: z.number().min(0).max(1),
  }),
  gameplay: z.object({
    animationPaused: z.boolean(),
    battleSpeed: z.number().positive(),
  }),
  debug: z.object({
    showDebugPanel: z.boolean(),
    mockMode: z.boolean(),
  }),
  currentWorktree: z.string().nullable(),
});

export const CharacterStateSchema = z.object({
  hp: z.number().nonnegative(),
  maxHp: z.number().positive(),
  state: z.enum(['Combat', 'Downed']),
  downtimeRemaining: z.number().nonnegative().optional(),
});

export const SaveDataSchema = z.object({
  version: z.number().int().positive(),
  lastSavedAt: z.string().datetime(),
  counters: z.object({
    todosCompletedTotal: z.number().int().nonnegative(),
    conversationsCompletedTotal: z.number().int().nonnegative(),
  }),
  tasks: z.object({
    claimedIds: z.array(z.string()),
  }),
  roster: z.object({
    characters: z.array(z.string()),
    maxSize: z.number().int().positive(),
  }),
  characterStates: z.record(CharacterStateSchema),
});
