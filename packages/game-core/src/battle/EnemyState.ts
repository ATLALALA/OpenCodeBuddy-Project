/**
 * 敌人状态数据
 */
export interface EnemyStateData {
  readonly id: string;
  readonly enemyId: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  /** 是否存活 */
  alive: boolean;
  /** 当前动作 */
  currentAction: string;
  /** 动作剩余时间 */
  actionTimer: number;
}

/**
 * 创建敌人状态
 */
export function createEnemyState(
  id: string,
  enemyId: string,
  stats: { hp: number; atk: number; def: number; spd: number }
): EnemyStateData {
  return {
    id,
    enemyId,
    hp: stats.hp,
    maxHp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    alive: true,
    currentAction: 'idle',
    actionTimer: 0,
  };
}

/**
 * 敌人受到伤害
 * @returns 是否死亡
 */
export function damageEnemy(enemy: EnemyStateData, damage: number): boolean {
  if (!enemy.alive) return false;

  enemy.hp = Math.max(0, enemy.hp - damage);

  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.currentAction = 'die';
    return true;
  }

  return false;
}
