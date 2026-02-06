import { Application, Container } from 'pixi.js';
import type { BattleState, BattleEvent, HeroStateData, EnemyStateData } from '@opencode-buddy/game-core';
import { AssetLoader } from './AssetLoader.js';
import { UnitView, createUnitView } from './UnitView.js';

/**
 * 战斗场景配置
 */
export interface BattleSceneConfig {
  width: number;
  height: number;
  heroPositionY: number;
  enemyPositionY: number;
  unitScale: number;
}

/**
 * 战斗场景 - 管理所有单位视图
 */
export class BattleScene {
  private app: Application;
  private assetLoader: AssetLoader;
  private config: BattleSceneConfig;

  private stageContainer: Container;
  private heroViews: Map<string, UnitView> = new Map();
  private enemyViews: Map<string, UnitView> = new Map();

  private initialized: boolean = false;

  constructor(
    app: Application,
    assetLoader: AssetLoader,
    config: BattleSceneConfig
  ) {
    this.app = app;
    this.assetLoader = assetLoader;
    this.config = config;

    this.stageContainer = new Container();
    this.app.stage.addChild(this.stageContainer);
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // 预加载素材可以在这里完成
    this.initialized = true;
  }

  /**
   * 同步战斗状态到视图
   */
  syncState(state: BattleState): void {
    // 同步英雄
    this.syncHeroes(state.heroes);

    // 同步敌人
    this.syncEnemies(state.enemies);
  }

  /**
   * 处理战斗事件
   */
  handleEvents(events: BattleEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'hero_attack':
        case 'hero_skill': {
          const heroId = event.data?.heroId as string;
          const targetId = event.data?.targetId as string;
          const heroView = this.heroViews.get(heroId);
          const targetView = this.enemyViews.get(targetId);

          if (heroView) {
            heroView.setAction(event.type === 'hero_skill' ? 'skill' : 'attack', true);
          }
          if (targetView) {
            targetView.triggerHitFlash();
            targetView.setAction('hit', true);
          }
          break;
        }

        case 'enemy_attack': {
          const enemyId = event.data?.enemyId as string;
          const targetId = event.data?.targetId as string;
          const enemyView = this.enemyViews.get(enemyId);
          const targetView = this.heroViews.get(targetId);

          if (enemyView) {
            enemyView.setAction('attack', true);
          }
          if (targetView) {
            targetView.triggerHitFlash();
            targetView.setAction('hit', true);
          }
          break;
        }

        case 'enemy_death': {
          const enemyId = event.data?.enemyId as string;
          const enemyView = this.enemyViews.get(enemyId);
          if (enemyView) {
            enemyView.setAction('die', true);
            // 延迟移除
            setTimeout(() => this.removeEnemy(enemyId), 500);
          }
          break;
        }

        case 'hero_downed': {
          const heroId = event.data?.heroId as string;
          const heroView = this.heroViews.get(heroId);
          if (heroView) {
            heroView.setDowned(true);
          }
          break;
        }

        case 'hero_recovered': {
          const heroId = event.data?.heroId as string;
          const heroView = this.heroViews.get(heroId);
          if (heroView) {
            heroView.setDowned(false);
          }
          break;
        }
      }
    }
  }

  /**
   * 更新（每帧调用）
   */
  update(dt: number): void {
    for (const view of this.heroViews.values()) {
      view.update(dt);
    }
    for (const view of this.enemyViews.values()) {
      view.update(dt);
    }
  }

  /**
   * 同步英雄视图
   */
  private syncHeroes(heroes: HeroStateData[]): void {
    const existingIds = new Set(this.heroViews.keys());

    heroes.forEach((hero, index) => {
      existingIds.delete(hero.id);

      let view = this.heroViews.get(hero.id);

      if (!view) {
        // 创建新视图 (soldier -> Soldier)
        const unitPath = `ArtAssets/Character/${hero.characterId.charAt(0).toUpperCase() + hero.characterId.slice(1)}`;
        view = createUnitView(this.assetLoader, {
          unitPath,
          scale: this.config.unitScale,
          flipX: false,
        });

        this.heroViews.set(hero.id, view);
        this.stageContainer.addChild(view);
      }

      // 更新位置
      const spacing = this.config.width / (heroes.length + 1);
      view.x = spacing * (index + 1);
      view.y = this.config.heroPositionY;

      // 更新 HP
      view.setHp(hero.hp, hero.maxHp);

      // 更新倒地状态
      view.setDowned(hero.state === 'Downed');
    });

    // 移除不存在的英雄
    for (const id of existingIds) {
      this.removeHero(id);
    }
  }

  /**
   * 同步敌人视图
   */
  private syncEnemies(enemies: EnemyStateData[]): void {
    const existingIds = new Set(this.enemyViews.keys());
    const aliveEnemies = enemies.filter(e => e.alive);

    aliveEnemies.forEach((enemy, index) => {
      existingIds.delete(enemy.id);

      let view = this.enemyViews.get(enemy.id);

      if (!view) {
        // 创建新视图 (orc -> Orc)
        const unitPath = `ArtAssets/Enemy/${enemy.enemyId.charAt(0).toUpperCase() + enemy.enemyId.slice(1)}`;
        view = createUnitView(this.assetLoader, {
          unitPath,
          scale: this.config.unitScale,
          flipX: true, // 敌人面向左边
        });

        this.enemyViews.set(enemy.id, view);
        this.stageContainer.addChild(view);
      }

      // 更新位置
      const spacing = this.config.width / (aliveEnemies.length + 1);
      view.x = spacing * (index + 1);
      view.y = this.config.enemyPositionY;

      // 更新 HP
      view.setHp(enemy.hp, enemy.maxHp);
    });

    // 移除不存在的敌人
    for (const id of existingIds) {
      this.removeEnemy(id);
    }
  }

  /**
   * 移除英雄视图
   */
  private removeHero(id: string): void {
    const view = this.heroViews.get(id);
    if (view) {
      this.stageContainer.removeChild(view);
      view.destroy();
      this.heroViews.delete(id);
    }
  }

  /**
   * 移除敌人视图
   */
  private removeEnemy(id: string): void {
    const view = this.enemyViews.get(id);
    if (view) {
      this.stageContainer.removeChild(view);
      view.destroy();
      this.enemyViews.delete(id);
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    for (const view of this.heroViews.values()) {
      view.destroy();
    }
    for (const view of this.enemyViews.values()) {
      view.destroy();
    }
    this.heroViews.clear();
    this.enemyViews.clear();
    this.stageContainer.destroy();
  }
}

/**
 * 创建战斗场景
 */
export function createBattleScene(
  app: Application,
  assetLoader: AssetLoader,
  config: BattleSceneConfig
): BattleScene {
  return new BattleScene(app, assetLoader, config);
}
