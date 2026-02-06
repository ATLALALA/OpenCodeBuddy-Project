import { BattlePhase, canSpawnEnemies } from './BattlePhase.js';
import {
  BattleState,
  WorkState,
  addEnemy,
  removeDeadEnemies,
  getAliveEnemyCount,
  generateEnemyId,
  detectTodoCompletion,
  isAllTodosComplete,
} from './BattleState.js';
import { HeroStateData, updateDownedRecovery, canHeroFight, heroEnterDowned } from './HeroState.js';
import { EnemyStateData, createEnemyState, damageEnemy } from './EnemyState.js';
import { ISpawnRule } from '../spawn/SpawnRule.js';
import { IActionPolicy, ActionDecision } from './ActionPolicy.js';

/**
 * 战斗事件类型
 */
export type BattleEventType =
  | 'phase_change'
  | 'enemy_spawn'
  | 'enemy_death'
  | 'hero_attack'
  | 'hero_skill'
  | 'enemy_attack'
  | 'hero_downed'
  | 'hero_recovered'
  | 'todo_resolved'
  | 'victory';

/**
 * 战斗事件
 */
export interface BattleEvent {
  type: BattleEventType;
  data?: Record<string, unknown>;
}

/**
 * 敌人配置（简化版，用于生成敌人）
 */
export interface EnemyConfigSimple {
  id: string;
  stats: {
    hp: number;
    atk: number;
    def: number;
    spd: number;
  };
}

/**
 * 战斗循环配置
 */
export interface BattleLoopConfig {
  /** 恢复时长（秒） */
  recoveryDuration: number;
  /** 恢复动画间隔（秒） */
  healInterval: number;
  /** 每次恢复的 HP 百分比 */
  hpRegenPercent: number;
  /** 处决清场时长（秒） */
  resolveDuration: number;
  /** 胜利庆祝时长（秒） */
  victoryDuration: number;
  /** 暴击伤害倍率 */
  critMultiplier: number;
  /** 防御减伤比例 */
  defendDamageReduction: number;
}

/**
 * 战斗循环
 */
export class BattleLoop {
  private state: BattleState;
  private spawnRule: ISpawnRule;
  private actionPolicy: IActionPolicy;
  private config: BattleLoopConfig;
  private enemyConfigs: Map<string, EnemyConfigSimple>;
  private events: BattleEvent[] = [];

  constructor(
    state: BattleState,
    spawnRule: ISpawnRule,
    actionPolicy: IActionPolicy,
    config: BattleLoopConfig,
    enemyConfigs: Map<string, EnemyConfigSimple>
  ) {
    this.state = state;
    this.spawnRule = spawnRule;
    this.actionPolicy = actionPolicy;
    this.config = config;
    this.enemyConfigs = enemyConfigs;
  }

  /**
   * 主循环 tick
   * @returns 本帧产生的事件列表
   */
  tick(dt: number, workState: WorkState): BattleEvent[] {
    this.events = [];

    // 阶段转换检测
    this.updatePhase(workState);

    // 根据阶段执行不同逻辑
    switch (this.state.phase) {
      case BattlePhase.Dormant:
        // 待机状态，检测会话开始
        if (workState.totalTodos > 0) {
          this.transitionTo(BattlePhase.SessionStart);
        }
        break;

      case BattlePhase.SessionStart:
        // 入场演出，直接进入战斗
        this.transitionTo(BattlePhase.Combat);
        break;

      case BattlePhase.Combat:
        this.updateCombat(dt, workState);
        break;

      case BattlePhase.ResolveTodo:
        this.updateResolve(dt);
        break;

      case BattlePhase.Victory:
        this.updateVictory(dt);
        break;
    }

    return this.events;
  }

  getState(): BattleState {
    return this.state;
  }

  private transitionTo(phase: BattlePhase): void {
    if (this.state.phase !== phase) {
      this.state.phase = phase;
      this.events.push({ type: 'phase_change', data: { phase } });
    }
  }

  private updatePhase(workState: WorkState): void {
    // 检测 todo 完成
    const completed = detectTodoCompletion(this.state, workState);

    if (completed > 0 && this.state.phase === BattlePhase.Combat) {
      // 进入处决清场
      this.state.resolveTimer = this.config.resolveDuration;
      this.transitionTo(BattlePhase.ResolveTodo);
      this.events.push({ type: 'todo_resolved', data: { count: completed } });
    }

    // 检测全部完成
    if (isAllTodosComplete(workState) && this.state.phase === BattlePhase.Combat) {
      this.state.victoryTimer = this.config.victoryDuration;
      this.transitionTo(BattlePhase.Victory);
      this.events.push({ type: 'victory' });
    }
  }

  private updateCombat(dt: number, workState: WorkState): void {
    // 1. 更新英雄恢复
    this.updateHeroRecovery(dt);

    // 2. 刷怪
    if (canSpawnEnemies(this.state.phase)) {
      this.updateSpawning(dt, workState.openTodos);
    }

    // 3. 英雄动作
    for (const hero of this.state.heroes) {
      if (canHeroFight(hero)) {
        const decision = this.actionPolicy.decideHeroAction(
          hero,
          this.state.enemies,
          workState.busy
        );
        this.executeHeroAction(hero, decision);
      }
    }

    // 4. 敌人动作
    for (const enemy of this.state.enemies) {
      if (enemy.alive) {
        const decision = this.actionPolicy.decideEnemyAction(enemy, this.state.heroes);
        this.executeEnemyAction(enemy, decision);
      }
    }

    // 5. 清理死亡敌人
    const dead = removeDeadEnemies(this.state);
    for (const enemy of dead) {
      this.events.push({ type: 'enemy_death', data: { enemyId: enemy.id } });
    }
  }

  private updateResolve(dt: number): void {
    this.state.resolveTimer -= dt;

    // 快速清场：杀死所有敌人
    for (const enemy of this.state.enemies) {
      if (enemy.alive) {
        damageEnemy(enemy, enemy.hp);
      }
    }

    if (this.state.resolveTimer <= 0) {
      this.transitionTo(BattlePhase.Combat);
    }
  }

  private updateVictory(dt: number): void {
    this.state.victoryTimer -= dt;

    if (this.state.victoryTimer <= 0) {
      // 回到待机
      this.transitionTo(BattlePhase.Dormant);
    }
  }

  private updateHeroRecovery(dt: number): void {
    for (const hero of this.state.heroes) {
      const recovered = updateDownedRecovery(
        hero,
        dt,
        this.config.healInterval,
        this.config.hpRegenPercent
      );

      if (recovered) {
        this.events.push({ type: 'hero_recovered', data: { heroId: hero.id } });
      }
    }
  }

  private updateSpawning(dt: number, openTodos: number): void {
    const targetCount = this.spawnRule.getTargetAliveCount(openTodos);
    const currentCount = getAliveEnemyCount(this.state);

    if (currentCount >= targetCount) {
      this.state.spawnTimer = 0;
      return;
    }

    this.state.spawnTimer -= dt;

    if (this.state.spawnTimer <= 0) {
      // 刷一个敌人
      const enemyTypeId = this.spawnRule.pickEnemyId();
      const config = this.enemyConfigs.get(enemyTypeId);

      if (config) {
        const id = generateEnemyId(this.state);
        const enemy = createEnemyState(id, enemyTypeId, config.stats);
        addEnemy(this.state, enemy);
        this.events.push({ type: 'enemy_spawn', data: { enemyId: id, enemyTypeId } });
      }

      // 重置计时器
      this.state.spawnTimer = this.spawnRule.getSpawnDelay();
    }
  }

  private executeHeroAction(hero: HeroStateData, decision: ActionDecision): void {
    if (decision.action === 'attack' || decision.action === 'skill') {
      const target = this.state.enemies.find(e => e.id === decision.target);
      if (target && target.alive) {
        // 简化伤害计算
        const baseDamage = 10; // TODO: 从英雄配置读取
        const multiplier = decision.action === 'skill' ? this.config.critMultiplier : 1;
        const damage = Math.max(1, baseDamage * multiplier - target.def);

        const killed = damageEnemy(target, damage);

        this.events.push({
          type: decision.action === 'skill' ? 'hero_skill' : 'hero_attack',
          data: { heroId: hero.id, targetId: target.id, damage, killed },
        });
      }
    }
  }

  private executeEnemyAction(enemy: EnemyStateData, decision: ActionDecision): void {
    if (decision.action === 'attack') {
      const target = this.state.heroes.find(h => h.id === decision.target);
      if (target && canHeroFight(target)) {
        // 简化伤害计算
        const damage = Math.max(1, enemy.atk - 5); // TODO: 从英雄防御读取
        target.hp = Math.max(0, target.hp - damage);

        this.events.push({
          type: 'enemy_attack',
          data: { enemyId: enemy.id, targetId: target.id, damage },
        });

        // 检查英雄倒地
        if (target.hp <= 0) {
          heroEnterDowned(target, this.config.recoveryDuration);
          this.events.push({ type: 'hero_downed', data: { heroId: target.id } });
        }
      }
    }
  }
}

/**
 * 创建战斗循环
 */
export function createBattleLoop(
  state: BattleState,
  spawnRule: ISpawnRule,
  actionPolicy: IActionPolicy,
  config: BattleLoopConfig,
  enemyConfigs: Map<string, EnemyConfigSimple>
): BattleLoop {
  return new BattleLoop(state, spawnRule, actionPolicy, config, enemyConfigs);
}
