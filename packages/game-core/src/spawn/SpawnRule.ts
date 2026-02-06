import type { GameParameters } from '@opencode-buddy/shared';

/**
 * 刷怪规则接口
 */
export interface ISpawnRule {
  /**
   * 计算目标敌人数量
   * @param openTodos 当前未完成的 todo 数量
   */
  getTargetAliveCount(openTodos: number): number;

  /**
   * 获取刷怪延迟（秒）
   */
  getSpawnDelay(): number;

  /**
   * 从敌人池中抽取敌人 ID
   */
  pickEnemyId(): string;
}

/**
 * 敌人池条目
 */
export interface EnemyPoolEntry {
  id: string;
  weight: number;
}

/**
 * 默认刷怪规则
 */
export class DefaultSpawnRule implements ISpawnRule {
  private readonly baseAlive: number;
  private readonly alivePerTodo: number;
  private readonly respawnDelayMin: number;
  private readonly respawnDelayMax: number;
  private readonly enemyPool: EnemyPoolEntry[];
  private readonly totalWeight: number;

  constructor(
    params: GameParameters['spawn'],
    enemyPool: EnemyPoolEntry[]
  ) {
    this.baseAlive = params.baseAliveCount;
    this.alivePerTodo = params.alivePerTodo;
    this.respawnDelayMin = params.respawnDelayMin;
    this.respawnDelayMax = params.respawnDelayMax;
    this.enemyPool = enemyPool;
    this.totalWeight = enemyPool.reduce((sum, e) => sum + e.weight, 0);
  }

  getTargetAliveCount(openTodos: number): number {
    return this.baseAlive + openTodos * this.alivePerTodo;
  }

  getSpawnDelay(): number {
    const range = this.respawnDelayMax - this.respawnDelayMin;
    return this.respawnDelayMin + Math.random() * range;
  }

  pickEnemyId(): string {
    if (this.enemyPool.length === 0) {
      return 'orc'; // fallback
    }

    let roll = Math.random() * this.totalWeight;

    for (const entry of this.enemyPool) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.id;
      }
    }

    return this.enemyPool[0].id;
  }
}

/**
 * 创建默认刷怪规则
 */
export function createDefaultSpawnRule(
  params: GameParameters['spawn'],
  enemyPool: EnemyPoolEntry[]
): ISpawnRule {
  return new DefaultSpawnRule(params, enemyPool);
}
