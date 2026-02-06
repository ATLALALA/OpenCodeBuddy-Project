import { BattlePhase } from './BattlePhase.js';
import { HeroStateData } from './HeroState.js';
import { EnemyStateData } from './EnemyState.js';

/**
 * 工作状态（从 BridgeState 提取）
 */
export interface WorkState {
  busy: boolean;
  idle: boolean;
  openTodos: number;
  doneTodos: number;
  totalTodos: number;
}

/**
 * 战斗状态
 */
export interface BattleState {
  /** 当前战斗阶段 */
  phase: BattlePhase;

  /** 英雄列表 */
  heroes: HeroStateData[];

  /** 敌人列表 */
  enemies: EnemyStateData[];

  /** 上一帧的 doneTodos 值，用于检测完成事件 */
  lastDoneTodos: number;

  /** 刷怪延迟计时器 */
  spawnTimer: number;

  /** 处决清场倒计时 */
  resolveTimer: number;

  /** 胜利庆祝倒计时 */
  victoryTimer: number;

  /** 敌人 ID 计数器 */
  enemyIdCounter: number;
}

/**
 * 创建初始战斗状态
 */
export function createBattleState(): BattleState {
  return {
    phase: BattlePhase.Dormant,
    heroes: [],
    enemies: [],
    lastDoneTodos: 0,
    spawnTimer: 0,
    resolveTimer: 0,
    victoryTimer: 0,
    enemyIdCounter: 0,
  };
}

/**
 * 添加英雄到战斗
 */
export function addHero(state: BattleState, hero: HeroStateData): void {
  state.heroes.push(hero);
}

/**
 * 添加敌人到战斗
 */
export function addEnemy(state: BattleState, enemy: EnemyStateData): void {
  state.enemies.push(enemy);
}

/**
 * 移除死亡的敌人
 */
export function removeDeadEnemies(state: BattleState): EnemyStateData[] {
  const dead = state.enemies.filter(e => !e.alive);
  state.enemies = state.enemies.filter(e => e.alive);
  return dead;
}

/**
 * 获取存活的敌人数量
 */
export function getAliveEnemyCount(state: BattleState): number {
  return state.enemies.filter(e => e.alive).length;
}

/**
 * 获取可战斗的英雄数量
 */
export function getCombatHeroCount(state: BattleState): number {
  return state.heroes.filter(h => h.state === 'Combat' && h.hp > 0).length;
}

/**
 * 生成唯一敌人实例 ID
 */
export function generateEnemyId(state: BattleState): string {
  state.enemyIdCounter++;
  return `enemy_${state.enemyIdCounter}`;
}

/**
 * 检测 todo 完成事件
 */
export function detectTodoCompletion(
  state: BattleState,
  workState: WorkState
): number {
  const completed = workState.doneTodos - state.lastDoneTodos;
  state.lastDoneTodos = workState.doneTodos;
  return Math.max(0, completed);
}

/**
 * 检查是否所有 todo 完成
 */
export function isAllTodosComplete(workState: WorkState): boolean {
  return workState.totalTodos > 0 && workState.openTodos === 0;
}
