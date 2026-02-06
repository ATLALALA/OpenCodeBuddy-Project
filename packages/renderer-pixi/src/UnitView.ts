import { Container, AnimatedSprite, Graphics, ColorMatrixFilter } from 'pixi.js';
import type { AssetLoader, LoadedAnimData } from './AssetLoader.js';

/**
 * 单位视图配置
 */
export interface UnitViewConfig {
  unitPath: string;
  scale?: number;
  flipX?: boolean;
}

/**
 * 单位视图 - 管理单位的动画渲染
 */
export class UnitView extends Container {
  private assetLoader: AssetLoader;
  private config: UnitViewConfig;
  private currentSprite: AnimatedSprite | null = null;
  private currentAction: string = 'idle';
  private hitFlashFilter: ColorMatrixFilter;
  private hitFlashTimer: number = 0;

  // 状态
  private _hp: number = 100;
  private _maxHp: number = 100;
  private _isDowned: boolean = false;

  // 血条
  private hpBarBg: Graphics;
  private hpBarFill: Graphics;

  constructor(assetLoader: AssetLoader, config: UnitViewConfig) {
    super();

    this.assetLoader = assetLoader;
    this.config = config;

    // 初始化受击滤镜
    this.hitFlashFilter = new ColorMatrixFilter();

    // 创建血条
    this.hpBarBg = new Graphics();
    this.hpBarFill = new Graphics();
    this.addChild(this.hpBarBg);
    this.addChild(this.hpBarFill);

    this.updateHpBar();

    // 初始化 idle 动画
    this.setAction('idle');

    // 应用缩放和翻转
    if (config.scale) {
      this.scale.set(config.scale);
    }
    if (config.flipX) {
      this.scale.x *= -1;
    }
  }

  /**
   * 设置动作（切换动画）
   */
  setAction(action: string, playOnce: boolean = false): void {
    if (this.currentAction === action && this.currentSprite) {
      return; // 同一动作，不切换
    }

    // 移除当前精灵
    if (this.currentSprite) {
      this.removeChild(this.currentSprite);
      this.currentSprite.destroy();
    }

    // 创建新精灵
    this.currentSprite = this.assetLoader.createAnimatedSprite(
      this.config.unitPath,
      action
    );

    if (this.currentSprite) {
      this.currentSprite.anchor.set(0.5, 1); // 底部中心锚点
      this.addChildAt(this.currentSprite, 0);

      if (playOnce) {
        this.currentSprite.loop = false;
        this.currentSprite.onComplete = () => {
          // 播放完成后回到 idle
          this.setAction('idle');
        };
      }

      this.currentSprite.play();
      this.currentAction = action;
    }
  }

  /**
   * 触发受击闪白效果
   */
  triggerHitFlash(duration: number = 0.1): void {
    this.hitFlashTimer = duration;

    // 应用白色滤镜
    this.hitFlashFilter.reset();
    this.hitFlashFilter.brightness(2, false);

    if (this.currentSprite && !this.currentSprite.filters?.includes(this.hitFlashFilter)) {
      this.currentSprite.filters = [this.hitFlashFilter];
    }
  }

  /**
   * 设置 HP
   */
  setHp(hp: number, maxHp: number): void {
    this._hp = hp;
    this._maxHp = maxHp;
    this.updateHpBar();
  }

  /**
   * 设置倒地状态
   */
  setDowned(isDowned: boolean): void {
    this._isDowned = isDowned;

    if (isDowned) {
      this.alpha = 0.5;
      this.setAction('die');
    } else {
      this.alpha = 1;
      this.setAction('idle');
    }
  }

  /**
   * 更新（每帧调用）
   */
  update(dt: number): void {
    // 更新受击闪白
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;

      if (this.hitFlashTimer <= 0 && this.currentSprite) {
        this.currentSprite.filters = [];
      }
    }
  }

  /**
   * 更新血条显示
   */
  private updateHpBar(): void {
    const barWidth = 40;
    const barHeight = 4;
    const barY = -60; // 在角色头顶

    // 背景
    this.hpBarBg.clear();
    this.hpBarBg.rect(-barWidth / 2, barY, barWidth, barHeight);
    this.hpBarBg.fill({ color: 0x333333 });

    // 填充
    const fillWidth = (this._hp / this._maxHp) * barWidth;
    const color = this._hp / this._maxHp > 0.3 ? 0x22cc22 : 0xcc2222;

    this.hpBarFill.clear();
    this.hpBarFill.rect(-barWidth / 2, barY, fillWidth, barHeight);
    this.hpBarFill.fill({ color });
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.currentSprite) {
      this.currentSprite.destroy();
    }
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    super.destroy();
  }
}

/**
 * 创建单位视图
 */
export function createUnitView(
  assetLoader: AssetLoader,
  config: UnitViewConfig
): UnitView {
  return new UnitView(assetLoader, config);
}
