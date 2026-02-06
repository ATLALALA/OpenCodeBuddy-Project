/**
 * 文件监听器 - 监听 .opencode/gamify/state.json
 */
import type { BridgeState } from '@opencode-buddy/shared';
export declare function startFileWatcher(worktree: string, onUpdate: (state: BridgeState) => void): void;
export declare function stopFileWatcher(): void;
//# sourceMappingURL=fileWatcher.d.ts.map