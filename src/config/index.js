module.exports = {
    WORKER_POOL: {
        MAX_WORKERS: 4,
        WORKER_TIMEOUT: 30000,
        RESTART_ON_FAILURE: true,
        MAX_RESTART_ATTEMPTS: 3
    },
    WALLET_GENERATION: {
        TARGET_SUFFIXES: [
            'wind', '9527', '6666', '8888', '9999', 
            '66666', '88888', '99999', '666666', '888888', 
            'money', 'flysky', '666', '888'
        ],
        GENERATION_DELAY: 10,
        BATCH_SIZE: 1000,
        MAX_WALLETS: 20000000,
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
        LOG_SENSITIVE_DATA: false,
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