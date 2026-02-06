/**
 * Renderer 进程入口
 */
import type { BridgeState } from '@opencode-buddy/shared';
declare global {
    interface Window {
        electronAPI: {
            getSettings: () => Promise<any>;
            saveSettings: (settings: any) => Promise<boolean>;
            minimizeWindow: () => void;
            closeWindow: () => void;
            toggleAlwaysOnTop: () => void;
            onBridgeStateUpdate: (callback: (state: BridgeState) => void) => void;
            removeBridgeStateListener: () => void;
        };
    }
}
//# sourceMappingURL=index.d.ts.map