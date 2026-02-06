/**
 * 战斗阶段枚举
 * 
 * Dormant → SessionStart → Combat ⇄ ResolveTodo → Victory
 */
export enum BattlePhase {
  /** 未检测到会话，待机状态 */
  Dormant = 'Dormant',

  /** 会话开始，入场演出 */
  SessionStart = 'SessionStart',

  /** 战斗循环进行中 */
  Combat = 'Combat',

  /** 处决清场（todo 完成时触发） */
  ResolveTodo = 'ResolveTodo',

  /** 胜利庆祝（所有 todo 完成） */
  Victory = 'Victory',
}

/**
 * 检查是否处于活跃战斗状态
 */
export function isActiveBattle(phase: BattlePhase): boolean {
  return phase === BattlePhase.Combat || phase === BattlePhase.ResolveTodo;
}

/**
 * 检查是否可以刷怪
 */
export function canSpawnEnemies(phase: BattlePhase): boolean {
  return phase === BattlePhase.Combat;
}
