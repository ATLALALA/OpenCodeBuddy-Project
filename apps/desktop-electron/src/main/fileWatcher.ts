/**
 * 文件监听器 - 监听 .opencode/gamify/state.json
 */

import { watch, type FSWatcher } from 'chokidar';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { BridgeState } from '@opencode-buddy/shared';
import { BridgeStateSchema } from '@opencode-buddy/shared';

let watcher: FSWatcher | null = null;
let lastContent: string = '';

const GAMIFY_STATE_PATH = '.opencode/gamify/state.json';

export function startFileWatcher(
  worktree: string,
  onUpdate: (state: BridgeState) => void
): void {
  const statePath = join(worktree, GAMIFY_STATE_PATH);

  // 如果已有 watcher，先停止
  stopFileWatcher();

  // 初始读取
  if (existsSync(statePath)) {
    tryReadAndNotify(statePath, onUpdate);
  }

  // 创建文件监听
  watcher = watch(statePath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('add', () => {
    tryReadAndNotify(statePath, onUpdate);
  });

  watcher.on('change', () => {
    tryReadAndNotify(statePath, onUpdate);
  });

  watcher.on('error', (error) => {
    console.error('[FileWatcher] Error:', error);
  });

  console.log(`[FileWatcher] Watching: ${statePath}`);
}

export function stopFileWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    lastContent = '';
    console.log('[FileWatcher] Stopped');
  }
}

function tryReadAndNotify(
  path: string,
  onUpdate: (state: BridgeState) => void
): void {
  try {
    const content = readFileSync(path, 'utf-8');

    // 去重：内容未变化则跳过
    if (content === lastContent) return;
    lastContent = content;

    const data = JSON.parse(content);

    // Zod 校验
    const result = BridgeStateSchema.safeParse(data);
    if (result.success) {
      onUpdate(result.data);
    } else {
      console.warn('[FileWatcher] Invalid state.json:', result.error.message);
    }
  } catch (error) {
    console.error('[FileWatcher] Read error:', error);
  }
}
