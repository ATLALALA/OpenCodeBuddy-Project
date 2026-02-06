import { HeroStateData, canHeroFight } from './HeroState.js';
import { EnemyStateData } from './EnemyState.js';

/**
 * 动作类型
 */
export type ActionType =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'skill'
  | 'hit'
  | 'die'
  | 'heal'
  | 'defend';

/**
 * 动作决策结果
 */
export interface ActionDecision {
  action: ActionType;
  target?: string; // 目标 ID
}

/**
 * 动作策略接口
 */
export interface IActionPolicy {
  /**
   * 决定英雄的下一个动作
   */
  decideHeroAction(
    hero: HeroStateData,
    enemies: EnemyStateData[],
    busy: boolean
  ): ActionDecision;

  /**
   * 决定敌人的下一个动作
   */
  decideEnemyAction(
    enemy: EnemyStateData,
    heroes: HeroStateData[]
  ): ActionDecision;
}

/**
 * 默认动作策略
 */
export class DefaultActionPolicy implements IActionPolicy {
  private readonly skillChance: number;

  constructor(skillChance: number = 0.08) {
    this.skillChance = skillChance;
  }

  decideHeroAction(
    hero: HeroStateData,
    enemies: EnemyStateData[],
    busy: boolean
  ): ActionDecision {
    // 不能战斗的英雄只能 idle 或 heal
    if (!canHeroFight(hero)) {
      return { action: 'heal' };
    }

    // 没有敌人时 idle
    const aliveEnemies = enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0) {
      return { action: 'idle' };
    }

    // OpenCode 忙碌时，降低攻击频率
    if (busy && Math.random() < 0.3) {
      return { action: 'idle' };
    }

    // 技能触发判定
    if (Math.random() < this.skillChance) {
      const target = this.pickRandomTarget(aliveEnemies);
      return { action: 'skill', target: target.id };
    }

    // 普通攻击
    const target = this.pickRandomTarget(aliveEnemies);
    return { action: 'attack', target: target.id };
  }

  decideEnemyAction(
    enemy: EnemyStateData,
    heroes: HeroStateData[]
  ): ActionDecision {
    if (!enemy.alive) {
      return { action: 'die' };
    }

    // 找可攻击的英雄
    const fightingHeroes = heroes.filter(h => canHeroFight(h));
    if (fightingHeroes.length === 0) {
      return { action: 'idle' };
    }

    // 攻击
    const target = this.pickRandomTarget(fightingHeroes);
    return { action: 'attack', target: target.id };
  }

  private pickRandomTarget<T extends { id: string }>(targets: T[]): T {
    const index = Math.floor(Math.random() * targets.length);
    return targets[index];
  }
}

/**
 * 创建默认动作策略
 */
export function createDefaultActionPolicy(skillChance?: number): IActionPolicy {
  return new DefaultActionPolicy(skillChance);
}
