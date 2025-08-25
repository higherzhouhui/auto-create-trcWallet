module.exports = {
    // 线程池配置
    WORKER_POOL: {
        MAX_WORKERS: 4,
        WORKER_TIMEOUT: 30000,
        RESTART_ON_FAILURE: true,
        MAX_RESTART_ATTEMPTS: 3
    },
    
    // 钱包生成配置
    WALLET_GENERATION: {
        TARGET_SUFFIXES: [
            'wind', '9527', '6666', '8888', '9999', 
            '66666', '88888', '99999', '666666', '888888', 
            'money', 'flysky', '666', '888'
        ],
        GENERATION_DELAY: 10, // 生成延迟（毫秒）
        BATCH_SIZE: 1000, // 批量处理大小
        MAX_WALLETS: 20000000, // 最大生成钱包数量
        LOG_INTERVAL: 10000, // 日志记录间隔
        MAX_RETRY_ATTEMPTS: 3, // 最大重试次数
        RETRY_DELAY: 1000 // 重试延迟（毫秒）
    },
    
    // 文件配置
    FILES: {
        OUTPUT_FILE: 'private.json',
        LOG_FILE: 'app.log',
        BACKUP_INTERVAL: 60000, // 备份间隔（毫秒）
        MAX_LOG_SIZE: 100 * 1024 * 1024, // 最大日志文件大小 (100MB)
        MAX_OUTPUT_SIZE: 500 * 1024 * 1024, // 最大输出文件大小 (500MB)
        AUTO_BACKUP: true,
        COMPRESS_OLD_LOGS: true
    },
    
    // 性能配置
    PERFORMANCE: {
        MEMORY_CHECK_INTERVAL: 30000, // 内存检查间隔
        MAX_MEMORY_USAGE: 0.8, // 最大内存使用率
        GC_THRESHOLD: 0.7, // 垃圾回收阈值
        BATCH_TIMEOUT: 30000, // 批处理超时时间
        QUEUE_MAX_SIZE: 10000 // 队列最大大小
    },
    
    // 安全配置
    SECURITY: {
        ENCRYPT_PRIVATE_KEYS: false, // 是否加密私钥
        ENCRYPTION_KEY: '', // 加密密钥
        LOG_SENSITIVE_DATA: false, // 是否记录敏感数据
        MAX_FAILED_ATTEMPTS: 10, // 最大失败尝试次数
        LOCKOUT_DURATION: 300000 // 锁定持续时间（毫秒）
    },
    
    // 监控配置
    MONITORING: {
        ENABLE_HEALTH_CHECK: true,
        HEALTH_CHECK_INTERVAL: 30000,
        ENABLE_PERFORMANCE_MONITORING: true,
        PERFORMANCE_LOG_INTERVAL: 60000,
        ENABLE_ERROR_REPORTING: true,
        MAX_ERROR_LOG_SIZE: 1000
    },
    
    // 恢复配置
    RECOVERY: {
        ENABLE_AUTO_RECOVERY: true,
        RECOVERY_ATTEMPTS: 3,
        RECOVERY_DELAY: 5000,
        SAVE_CHECKPOINT_INTERVAL: 300000, // 检查点保存间隔
        ENABLE_STATE_PERSISTENCE: true
    }
}; 