import { Assets, Texture, AnimatedSprite, Spritesheet, Rectangle } from 'pixi.js';

/**
 * 动画定义
 */
export interface AnimDef {
  variants: string[];
  fps: number;
  loop?: boolean;
}

/**
 * 动画配置
 */
export interface AnimsConfig {
  idle: AnimDef;
  walk?: AnimDef;
  attack?: AnimDef;
  skill?: AnimDef;
  hit?: AnimDef;
  die?: AnimDef;
  heal?: AnimDef;
  defend?: AnimDef;
}

/**
 * 加载的动画帧数据
 */
export interface LoadedAnimData {
  textures: Texture[];
  fps: number;
  loop: boolean;
}

/**
 * 素材加载器
 */
export class AssetLoader {
  private textureCache: Map<string, Texture> = new Map();
  private animCache: Map<string, Map<string, LoadedAnimData[]>> = new Map();
  private basePath: string;

  constructor(basePath: string = '') {
    this.basePath = basePath;
  }

  /**
   * 加载角色/敌人的所有动画
   */
  async loadUnit(unitPath: string, anims: AnimsConfig): Promise<void> {
    const unitKey = unitPath;

    if (this.animCache.has(unitKey)) {
      return; // 已加载
    }

    const animMap = new Map<string, LoadedAnimData[]>();

    for (const [actionName, animDef] of Object.entries(anims)) {
      if (!animDef) continue;

      const variants: LoadedAnimData[] = [];

      for (const variantName of animDef.variants) {
        const variantPath = `${this.basePath}${unitPath}/${variantName}`;
        const loaded = await this.loadAnimVariant(variantPath, animDef);
        if (loaded) {
          variants.push(loaded);
        }
      }

      // 如果没有加载到任何变体，使用 fallback
      if (variants.length === 0 && actionName !== 'idle') {
        // fallback 到 idle
        const idleData = animMap.get('idle');
        if (idleData && idleData.length > 0) {
          variants.push(idleData[0]);
        }
      }

      if (variants.length > 0) {
        animMap.set(actionName, variants);
      }
    }

    this.animCache.set(unitKey, animMap);
  }

  /**
   * 获取动画数据（随机选择变体）
   */
  getAnim(unitPath: string, action: string): LoadedAnimData | null {
    const animMap = this.animCache.get(unitPath);
    if (!animMap) return null;

    let variants = animMap.get(action);

    // Fallback 到 idle
    if (!variants || variants.length === 0) {
      variants = animMap.get('idle');
    }

    if (!variants || variants.length === 0) return null;

    // 随机选择变体
    const index = Math.floor(Math.random() * variants.length);
    return variants[index];
  }

  /**
   * 创建动画精灵
   */
  createAnimatedSprite(unitPath: string, action: string): AnimatedSprite | null {
    const animData = this.getAnim(unitPath, action);
    if (!animData || animData.textures.length === 0) return null;

    const sprite = new AnimatedSprite(animData.textures);
    sprite.animationSpeed = animData.fps / 60; // 假设 60fps
    sprite.loop = animData.loop;

    return sprite;
  }

  /**
   * 加载单个动画变体
   */
  private async loadAnimVariant(variantPath: string, animDef: AnimDef): Promise<LoadedAnimData | null> {
    try {
      // 尝试加载 JSON spritesheet
      const spritesheetPath = `${variantPath}/spritesheet.json`;

      try {
        const sheet = await Assets.load<Spritesheet>(spritesheetPath);
        if (sheet && sheet.textures) {
          const textures = Object.values(sheet.textures);
          return {
            textures,
            fps: animDef.fps,
            loop: animDef.loop ?? false,
          };
        }
      } catch {
        // Spritesheet JSON 不存在，尝试横向 spritesheet PNG
      }

      // 尝试加载横向 spritesheet PNG（variantPath/variantName.png）
      const variantName = variantPath.split('/').pop() || '';
      const spritesheetPngPath = `${variantPath}/${variantName}.png`;

      try {
        const textures = await this.loadHorizontalSpritesheet(spritesheetPngPath);
        if (textures.length > 0) {
          return {
            textures,
            fps: animDef.fps,
            loop: animDef.loop ?? false,
          };
        }
      } catch {
        // 横向 spritesheet 也不存在
      }

      return null;
    } catch (error) {
      console.warn(`Failed to load anim variant: ${variantPath}`, error);
      return null;
    }
  }

  /**
   * 加载横向 spritesheet PNG 并自动切割为帧
   * 假设所有帧等宽等高，帧高度 = 图片高度，帧数 = 图片宽度 / 帧高度
   */
  private async loadHorizontalSpritesheet(path: string): Promise<Texture[]> {
    try {
      const baseTexture = await Assets.load<Texture>(path);
      if (!baseTexture) return [];

      const { width, height } = baseTexture;

      // 假设帧是正方形或者帧宽 = 帧高
      const frameWidth = height; // 假设帧是高度的正方形
      const frameCount = Math.floor(width / frameWidth);

      if (frameCount <= 0) {
        // 无法切割，作为单帧返回
        return [baseTexture];
      }

      const textures: Texture[] = [];

      for (let i = 0; i < frameCount; i++) {
        const frame = new Texture({
          source: baseTexture.source,
          frame: new Rectangle(
            i * frameWidth,
            0,
            frameWidth,
            height
          ),
        });
        textures.push(frame);
      }

      console.log(`[AssetLoader] Loaded ${frameCount} frames from ${path}`);
      return textures;
    } catch (error) {
      console.warn(`[AssetLoader] Failed to load spritesheet: ${path}`, error);
      return [];
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.textureCache.clear();
    this.animCache.clear();
  }
}

/**
 * 创建素材加载器
 */
export function createAssetLoader(basePath?: string): AssetLoader {
  return new AssetLoader(basePath);
}
