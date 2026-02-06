/**
 * PlayerData - 可写玩家数据类型
 * 
 * 字段可变，支持运行时读写。
 * 对应 PlayerData/ 目录下的 JSON 文件。
 */

// ============================================================
// Settings - 用户设置
// ============================================================

export interface WindowSettings {
  width: number;
  height: number;
  x: number;
  y: number;
  alwaysOnTop: boolean;
  opacity: number;
}

export interface AudioSettings {
  muted: boolean;
  volume: number;
}

export interface GameplaySettings {
  animationPaused: boolean;
  battleSpeed: number;
}

export interface DebugSettings {
  showDebugPanel: boolean;
  mockMode: boolean;
}

export interface Settings {
  version: number;
  window: WindowSettings;
  audio: AudioSettings;
  gameplay: GameplaySettings;
  debug: DebugSettings;
  currentWorktree: string | null;
}

// ============================================================
// SaveData - 玩家存档
// ============================================================

export interface SaveCounters {
  todosCompletedTotal: number;
  conversationsCompletedTotal: number;
}

export interface SaveTasks {
  claimedIds: string[];
}

export interface SaveRoster {
  characters: string[];
  maxSize: number;
}

/** 角色战斗状态 */
export type CharacterCombatState = 'Combat' | 'Downed';

export interface CharacterState {
  hp: number;
  maxHp: number;
  state: CharacterCombatState;
  /** 仅 Downed 状态有效：剩余恢复时间（秒） */
  downtimeRemaining?: number;
}

export interface SaveData {
  version: number;
  lastSavedAt: string;
  counters: SaveCounters;
  tasks: SaveTasks;
  roster: SaveRoster;
  characterStates: Record<string, CharacterState>;
}

// ============================================================
// 默认值工厂函数
// ============================================================

export function createDefaultSettings(): Settings {
  return {
    version: 1,
    window: {
      width: 360,
      height: 220,
      x: 100,
      y: 100,
      alwaysOnTop: true,
      opacity: 1.0,
    },
    audio: {
      muted: false,
      volume: 0.8,
    },
    gameplay: {
      animationPaused: false,
      battleSpeed: 1.0,
    },
    debug: {
      showDebugPanel: false,
      mockMode: false,
    },
    currentWorktree: null,
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    version: 1,
    lastSavedAt: new Date().toISOString(),
    counters: {
      todosCompletedTotal: 0,
      conversationsCompletedTotal: 0,
    },
    tasks: {
      claimedIds: [],
    },
    roster: {
      characters: ['soldier'],
      maxSize: 6,
    },
    characterStates: {
      soldier: {
        hp: 100,
        maxHp: 100,
        state: 'Combat',
      },
    },
  };
}
