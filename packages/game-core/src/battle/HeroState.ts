/**
 * 英雄状态枚举
 */
export enum HeroStateType {
  /** 战斗中 */
  Combat = 'Combat',

  /** 倒地恢复中 */
  Downed = 'Downed',
}

/**
 * 英雄状态数据
 */
export interface HeroStateData {
  readonly id: string;
  readonly characterId: string;
  hp: number;
  maxHp: number;
  state: HeroStateType;
  /** 恢复剩余时间（秒），仅 Downed 状态有效 */
  downtimeRemaining: number;
  /** 上次恢复动画播放时间 */
  lastHealAnimTime: number;
}

/**
 * 创建默认英雄状态
 */
export function createHeroState(
  id: string,
  characterId: string,
  maxHp: number
): HeroStateData {
  return {
    id,
    characterId,
    hp: maxHp,
    maxHp,
    state: HeroStateType.Combat,
    downtimeRemaining: 0,
    lastHealAnimTime: 0,
  };
}

/**
 * 英雄进入倒地状态
 */
export function heroEnterDowned(
  hero: HeroStateData,
  recoveryDuration: number
): void {
  hero.state = HeroStateType.Downed;
  hero.hp = 0;
  hero.downtimeRemaining = recoveryDuration;
  hero.lastHealAnimTime = 0;
}

/**
 * 更新倒地恢复状态
 * @returns 是否完成恢复
 */
export function updateDownedRecovery(
  hero: HeroStateData,
  dt: number,
  healInterval: number,
  hpRegenPercent: number
): boolean {
  if (hero.state !== HeroStateType.Downed) return false;

  hero.downtimeRemaining -= dt;
  hero.lastHealAnimTime += dt;

  // 周期性恢复 HP
  if (hero.lastHealAnimTime >= healInterval) {
    hero.lastHealAnimTime = 0;
    hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * hpRegenPercent);
  }

  // 检查恢复完成
  if (hero.downtimeRemaining <= 0 || hero.hp >= hero.maxHp) {
    hero.state = HeroStateType.Combat;
    hero.hp = hero.maxHp;
    hero.downtimeRemaining = 0;
    return true;
  }

  return false;
}

/**
 * 检查英雄是否可以参与战斗
 */
export function canHeroFight(hero: HeroStateData): boolean {
  return hero.state === HeroStateType.Combat && hero.hp > 0;
}
