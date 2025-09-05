module.exports = {
    WORKER_POOL: {
        MAX_WORKERS: 10,
        WORKER_TIMEOUT: 30000,
        RESTART_ON_FAILURE: true,
        MAX_RESTART_ATTEMPTS: 3
    },
    WALLET_GENERATION: {
        TARGET_SUFFIXES: [
            '66666', '88888', '99999', '666666', '888888', '999999'
        ],
        GENERATION_DELAY: 10,
        BATCH_SIZE: 10000,
        MAX_WALLETS: 2000000000,
        LOG_INTERVAL: 10000,
        MAX_RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    FILES: {
        OUTPUT_FILE: 'private.json',
        LOG_FILE: 'app.log',
        BACKUP_INTERVAL: 60000,
        MAX_LOG_SIZE: 100 * 1024 * 1024,
        MAX_OUTPUT_SIZE: 500 * 1024 * 1024,
        AUTO_BACKUP: true,
        COMPRESS_OLD_LOGS: true
    },
    PERFORMANCE: {
        MEMORY_CHECK_INTERVAL: 30000,
        MAX_MEMORY_USAGE: 0.8,
        GC_THRESHOLD: 0.7,
        BATCH_TIMEOUT: 30000,
        QUEUE_MAX_SIZE: 10000
    },
    SECURITY: {
        ENCRYPT_PRIVATE_KEYS: false,
        ENCRYPTION_KEY: '',
        LOG_SENSITIVE_DATA: true, // 改为true以保存完整钱包信息
        MAX_FAILED_ATTEMPTS: 10,
        LOCKOUT_DURATION: 300000
    },
    MONITORING: {
        ENABLE_HEALTH_CHECK: true,
        HEALTH_CHECK_INTERVAL: 30000,
        ENABLE_PERFORMANCE_MONITORING: true,
        PERFORMANCE_LOG_INTERVAL: 60000,
        ENABLE_ERROR_REPORTING: true,
        MAX_ERROR_LOG_SIZE: 1000
    },
    RECOVERY: {
        ENABLE_AUTO_RECOVERY: true,
        RECOVERY_ATTEMPTS: 3,
        RECOVERY_DELAY: 5000,
        SAVE_CHECKPOINT_INTERVAL: 300000,
        ENABLE_STATE_PERSISTENCE: true
    }
}; 