/**
 * 配置向导 - 首次启动时引导用户设置工作目录
 */
// 使用 any 类型避免与 index.ts 的全局声明冲突
const getElectronAPI = () => window.electronAPI;
export class ConfigWizard {
    overlay = null;
    input = null;
    saveBtn = null;
    onComplete = null;
    constructor() {
        this.overlay = document.getElementById('config-wizard');
        this.input = document.getElementById('worktree-input');
        this.saveBtn = document.getElementById('wizard-save-btn');
        this.setupEventListeners();
    }
    setupEventListeners() {
        // 保存按钮点击
        this.saveBtn?.addEventListener('click', () => this.handleSave());
        // 输入框回车
        this.input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSave();
            }
        });
        // 输入验证
        this.input?.addEventListener('input', () => {
            this.validateInput();
        });
    }
    /**
     * 检查是否需要显示配置向导
     */
    async checkAndShow(onComplete) {
        this.onComplete = onComplete || null;
        try {
            // 如果没有 electronAPI（浏览器模式），不显示向导
            const api = getElectronAPI();
            if (!api) {
                console.log('[ConfigWizard] No electronAPI, skipping wizard');
                return false;
            }
            const settings = await api.getSettings();
            // 如果已经配置了 worktree，不显示向导
            if (settings.currentWorktree) {
                console.log('[ConfigWizard] Worktree already configured:', settings.currentWorktree);
                return false;
            }
            // 显示向导
            this.show();
            return true;
        }
        catch (error) {
            console.error('[ConfigWizard] Error checking settings:', error);
            return false;
        }
    }
    /**
     * 显示配置向导
     */
    show() {
        this.overlay?.classList.remove('hidden');
        this.input?.focus();
    }
    /**
     * 隐藏配置向导
     */
    hide() {
        this.overlay?.classList.add('hidden');
    }
    /**
     * 验证输入
     */
    validateInput() {
        const value = this.input?.value.trim() || '';
        if (!value) {
            this.saveBtn?.setAttribute('disabled', 'true');
            return false;
        }
        this.saveBtn?.removeAttribute('disabled');
        return true;
    }
    /**
     * 处理保存
     */
    async handleSave() {
        if (!this.validateInput())
            return;
        const worktree = this.input?.value.trim() || '';
        try {
            // 获取当前设置
            const api = getElectronAPI();
            if (!api)
                return;
            const settings = await api.getSettings();
            if (!settings)
                return;
            // 更新 worktree
            settings.currentWorktree = worktree;
            // 保存设置
            await api.saveSettings(settings);
            console.log('[ConfigWizard] Settings saved, worktree:', worktree);
            // 隐藏向导
            this.hide();
            // 触发完成回调
            this.onComplete?.();
        }
        catch (error) {
            console.error('[ConfigWizard] Error saving settings:', error);
            alert('保存设置失败，请重试');
        }
    }
}
/**
 * 创建配置向导实例
 */
export function createConfigWizard() {
    return new ConfigWizard();
}
//# sourceMappingURL=ConfigWizard.js.map