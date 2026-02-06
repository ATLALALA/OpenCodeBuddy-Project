/**
 * 配置向导 - 首次启动时引导用户设置工作目录
 */
export declare class ConfigWizard {
    private overlay;
    private input;
    private saveBtn;
    private onComplete;
    constructor();
    private setupEventListeners;
    /**
     * 检查是否需要显示配置向导
     */
    checkAndShow(onComplete?: () => void): Promise<boolean>;
    /**
     * 显示配置向导
     */
    show(): void;
    /**
     * 隐藏配置向导
     */
    hide(): void;
    /**
     * 验证输入
     */
    private validateInput;
    /**
     * 处理保存
     */
    private handleSave;
}
/**
 * 创建配置向导实例
 */
export declare function createConfigWizard(): ConfigWizard;
//# sourceMappingURL=ConfigWizard.d.ts.map