const fs = require('fs').promises;
const tronWallet = require('tron-wallet-hd');
const { pkToAddress } = require("@tronscan/client/src/utils/crypto");
const config = require('../config');

// 启动函数 - 这个函数会被workerpool调用
async function start() {
    try {
        // 配置参数
        const CONFIG = config.WALLET_GENERATION;
        const FILES_CONFIG = config.FILES;
        const PERFORMANCE_CONFIG = config.PERFORMANCE;
        const SECURITY_CONFIG = config.SECURITY;
        const MONITORING_CONFIG = config.MONITORING;
        const RECOVERY_CONFIG = config.RECOVERY;
        
        // 统计信息
        let stats = {
            totalGenerated: 0,
            totalMatched: 0,
            startTime: Date.now(),
            lastLogTime: Date.now(),
            errors: [],
            lastCheckpoint: Date.now(),
            restartCount: 0
        };
        
        // 状态持久化管理器
        class StateManager {
            constructor() {
                this.stateFile = 'wallet_state.json';
                this.checkpointFile = 'wallet_checkpoint.json';
            }
            
            async saveState() {
                try {
                    const state = {
                        stats: { ...stats },
                        timestamp: Date.now(),
                        version: '1.0.0'
                    };
                    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
                } catch (error) {
                    console.error('保存状态失败:', error.message);
                }
            }
            
            async loadState() {
                try {
                    if (await fs.access(this.stateFile).then(() => true).catch(() => false)) {
                        const data = await fs.readFile(this.stateFile, 'utf8');
                        const state = JSON.parse(data);
                        if (state.stats && state.version === '1.0.0') {
                            stats = { ...state.stats };
                            console.log('✅ 状态恢复成功');
                            return true;
                        }
                    }
                } catch (error) {
                    console.error('加载状态失败:', error.message);
                }
                return false;
            }
            
            async saveCheckpoint() {
                try {
                    const checkpoint = {
                        stats: { ...stats },
                        timestamp: Date.now()
                    };
                    await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
                    stats.lastCheckpoint = Date.now();
                } catch (error) {
                    console.error('保存检查点失败:', error.message);
                }
            }
        }
        
        // 文件管理器
        class FileManager {
            constructor() {
                this.outputFile = FILES_CONFIG.OUTPUT_FILE;
                this.logFile = FILES_CONFIG.LOG_FILE;
            }
            
            async checkFileSize(filePath) {
                try {
                    const stats = await fs.stat(filePath);
                    return stats.size;
                } catch (error) {
                    return 0;
                }
            }
            
            async rotateLogFile() {
                try {
                    const size = await this.checkFileSize(this.logFile);
                    if (size > FILES_CONFIG.MAX_LOG_SIZE) {
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const backupFile = `${this.logFile}.${timestamp}`;
                        await fs.rename(this.logFile, backupFile);
                        console.log(`日志文件已轮转: ${backupFile}`);
                    }
                } catch (error) {
                    console.error('日志文件轮转失败:', error.message);
                }
            }
            
            async backupOutputFile() {
                try {
                    if (FILES_CONFIG.AUTO_BACKUP) {
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const backupFile = `${this.outputFile}.${timestamp}`;
                        if (await fs.access(this.outputFile).then(() => true).catch(() => false)) {
                            await fs.copyFile(this.outputFile, backupFile);
                            console.log(`输出文件已备份: ${backupFile}`);
                        }
                    }
                } catch (error) {
                    console.error('输出文件备份失败:', error.message);
                }
            }
        }
        
        // 内存管理器
        class MemoryManager {
            constructor() {
                this.lastGC = Date.now();
                this.memoryThreshold = PERFORMANCE_CONFIG.MAX_MEMORY_USAGE;
            }
            
            checkMemoryUsage() {
                const used = process.memoryUsage();
                const heapUsed = used.heapUsed / 1024 / 1024; // MB
                const heapTotal = used.heapTotal / 1024 / 1024; // MB
                const usage = heapUsed / heapTotal;
                
                if (usage > this.memoryThreshold) {
                    this.forceGarbageCollection();
                    return false;
                }
                return true;
            }
            
            forceGarbageCollection() {
                if (global.gc) {
                    global.gc();
                    this.lastGC = Date.now();
                    console.log('🔄 强制垃圾回收已执行');
                }
            }
        }
        
        // 错误管理器
        class ErrorManager {
            constructor() {
                this.errors = [];
                this.maxErrors = MONITORING_CONFIG.MAX_ERROR_LOG_SIZE;
            }
            
            addError(error, context = '') {
                const errorInfo = {
                    message: error.message,
                    stack: error.stack,
                    context,
                    timestamp: Date.now()
                };
                
                this.errors.push(errorInfo);
                
                if (this.errors.length > this.maxErrors) {
                    this.errors = this.errors.slice(-this.maxErrors);
                }
                
                this.logError(errorInfo);
            }
            
            async logError(errorInfo) {
                try {
                    const errorLog = `[${new Date(errorInfo.timestamp).toISOString()}] ERROR: ${errorInfo.message}\nContext: ${errorInfo.context}\nStack: ${errorInfo.stack}\n---\n`;
                    await fs.appendFile('error.log', errorLog);
                } catch (error) {
                    console.error('写入错误日志失败:', error.message);
                }
            }
            
            getErrorSummary() {
                const errorCount = this.errors.length;
                const recentErrors = this.errors.slice(-10);
                return { errorCount, recentErrors };
            }
        }
        
        // 日志记录器
        class Logger {
            constructor(fileManager) {
                this.fileManager = fileManager;
            }
            
            async log(message, type = 'INFO') {
                const timestamp = new Date().toISOString();
                const logMessage = `[${timestamp}] [${type}] ${message}`;
                console.log(logMessage);
                
                // 检查日志文件大小并轮转
                await this.fileManager.rotateLogFile();
                
                // 写入日志文件
                try {
                    await fs.appendFile(this.fileManager.logFile, logMessage + '\n');
                } catch (error) {
                    console.error('写入日志文件失败:', error);
                }
            }
            
            async progress() {
                const now = Date.now();
                const elapsed = (now - stats.startTime) / 1000;
                const rate = stats.totalGenerated / Math.max(elapsed, 1);
                const estimatedTime = rate > 0 ? (CONFIG.MAX_WALLETS - stats.totalGenerated) / rate : 0;
                
                await this.log(`进度: ${stats.totalGenerated.toLocaleString()}/${CONFIG.MAX_WALLETS.toLocaleString()} (${((stats.totalGenerated / CONFIG.MAX_WALLETS) * 100).toFixed(2)}%)`);
                await this.log(`生成速度: ${rate.toFixed(2)} 钱包/秒`);
                await this.log(`已匹配: ${stats.totalMatched} 个地址`);
                await this.log(`预计剩余时间: ${(estimatedTime / 60).toFixed(2)} 分钟`);
                await this.log(`运行时间: ${(elapsed / 60).toFixed(2)} 分钟`);
                
                // 内存使用情况
                const used = process.memoryUsage();
                const heapUsed = (used.heapUsed / 1024 / 1024).toFixed(2);
                const heapTotal = (used.heapTotal / 1024 / 1024).toFixed(2);
                await this.log(`内存使用: ${heapUsed}MB / ${heapTotal}MB`);
                
                await this.log('---');
                
                stats.lastLogTime = now;
            }
        }
        
        // 钱包生成器类
        class WalletGenerator {
            constructor(logger, fileManager, memoryManager, errorManager, stateManager) {
                this.logger = logger;
                this.fileManager = fileManager;
                this.memoryManager = memoryManager;
                this.errorManager = errorManager;
                this.stateManager = stateManager;
                
                this.isRunning = false;
                this.batchQueue = [];
                this.processingBatch = false;
                this.batchProcessor = null;
                this.healthCheckInterval = null;
                this.backupInterval = null;
                this.checkpointInterval = null;
                this.retryCount = 0;
            }
            
            async generateWallet() {
                try {
                    // 检查内存使用
                    if (!this.memoryManager.checkMemoryUsage()) {
                        await this.logger.log('内存使用过高，暂停生成', 'WARN');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    const mnemonic = tronWallet.utils.generateMnemonic();
                    const accounts = await tronWallet.utils.generateAccountsWithMnemonic(mnemonic, 1);
                    
                    const privateKey = accounts[0].privateKey;
                    const address = pkToAddress(privateKey.replace(/^0x/, ''));
                    const addressSuffix = address.substring(address.length - 6).toLowerCase();
                    
                    // 创建完整的钱包数据（用于保存）
                    const fullWalletData = {
                        address,
                        mnemonic,
                        privateKey,
                        timestamp: new Date().toISOString(),
                        suffix: addressSuffix
                    };
                    
                    // 创建日志用的钱包数据（可能隐藏敏感信息）
                    const logWalletData = {
                        address,
                        mnemonic: SECURITY_CONFIG.LOG_SENSITIVE_DATA ? mnemonic : '[HIDDEN]',
                        privateKey: SECURITY_CONFIG.LOG_SENSITIVE_DATA ? privateKey : '[HIDDEN]',
                        timestamp: new Date().toISOString(),
                        suffix: addressSuffix
                    };
                    
                    // 检查是否匹配目标后缀
                    const isMatch = CONFIG.TARGET_SUFFIXES.some(suffix => addressSuffix.includes(suffix));
                    
                    if (isMatch) {
                        // 保存完整的钱包信息到文件
                        await this.saveMatchedWallet(fullWalletData);
                        stats.totalMatched++;
                        await this.logger.log(`找到匹配地址: ${address} (后缀: ${addressSuffix})`, 'SUCCESS');
                    }
                    
                    stats.totalGenerated++;
                    return logWalletData;
                    
                } catch (error) {
                    this.errorManager.addError(error, 'generateWallet');
                    await this.logger.log(`生成钱包时发生错误: ${error.message}`, 'ERROR');
                    
                    // 重试机制
                    if (this.retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
                        this.retryCount++;
                        await this.logger.log(`重试第 ${this.retryCount} 次`, 'INFO');
                        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                        return this.generateWallet();
                    } else {
                        this.retryCount = 0;
                        throw error;
                    }
                }
            }
            
            async saveMatchedWallet(walletData) {
                try {
                    const data = JSON.stringify(walletData) + '\n---\n';
                    await fs.appendFile(this.fileManager.outputFile, data);
                    await this.logger.log(`已保存匹配钱包到 ${this.fileManager.outputFile}`, 'SUCCESS');
                } catch (error) {
                    this.errorManager.addError(error, 'saveMatchedWallet');
                    await this.logger.log(`保存钱包文件时发生错误: ${error.message}`, 'ERROR');
                    throw error;
                }
            }
            
            async processBatch() {
                if (this.processingBatch || this.batchQueue.length === 0) return;
                
                this.processingBatch = true;
                const batchSize = Math.min(CONFIG.BATCH_SIZE, this.batchQueue.length);
                const batch = this.batchQueue.splice(0, batchSize);
                
                try {
                    // 设置批处理超时
                    const batchPromise = Promise.allSettled(
                        batch.map(() => this.generateWallet())
                    );
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('批处理超时')), PERFORMANCE_CONFIG.BATCH_TIMEOUT)
                    );
                    
                    await Promise.race([batchPromise, timeoutPromise]);
                    
                    // 定期记录进度
                    if (stats.totalGenerated % CONFIG.LOG_INTERVAL === 0) {
                        await this.logger.progress();
                    }
                    
                    // 保存检查点
                    if (RECOVERY_CONFIG.ENABLE_STATE_PERSISTENCE && 
                        (Date.now() - stats.lastCheckpoint) > RECOVERY_CONFIG.SAVE_CHECKPOINT_INTERVAL) {
                        await this.stateManager.saveCheckpoint();
                    }
                    
                } catch (error) {
                    this.errorManager.addError(error, 'processBatch');
                    await this.logger.log(`批量处理时发生错误: ${error.message}`, 'ERROR');
                } finally {
                    this.processingBatch = false;
                    
                    // 如果还有队列中的任务，继续处理
                    if (this.batchQueue.length > 0) {
                        setTimeout(() => this.processBatch(), 0);
                    }
                }
            }
            
            async start() {
                if (this.isRunning) return;
                
                try {
                    // 尝试恢复状态
                    if (RECOVERY_CONFIG.ENABLE_STATE_PERSISTENCE) {
                        await this.stateManager.loadState();
                    }
                    
                    this.isRunning = true;
                    await this.logger.log('开始生成钱包...', 'INFO');
                    await this.logger.log(`目标后缀: ${CONFIG.TARGET_SUFFIXES.join(', ')}`, 'INFO');
                    await this.logger.log(`生成延迟: ${CONFIG.GENERATION_DELAY}ms`, 'INFO');
                    await this.logger.log(`批量大小: ${CONFIG.BATCH_SIZE}`, 'INFO');
                    await this.logger.log('---', 'INFO');
                    
                    // 启动健康检查
                    this.startHealthCheck();
                    
                    // 启动备份任务
                    this.startBackupTask();
                    
                    // 启动检查点保存
                    this.startCheckpointTask();
                    
                    // 修复生成逻辑
                    const generateLoop = async () => {
                        while (this.isRunning && stats.totalGenerated < CONFIG.MAX_WALLETS) {
                            try {
                                // 检查队列大小限制
                                if (this.batchQueue.length < PERFORMANCE_CONFIG.QUEUE_MAX_SIZE) {
                                    // 直接生成钱包，而不是只添加到队列
                                    await this.generateWallet();
                                } else {
                                    await this.logger.log('队列已满，等待处理', 'WARN');
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                }
                                
                                // 添加延迟
                                await new Promise(resolve => setTimeout(resolve, CONFIG.GENERATION_DELAY));
                                
                            } catch (error) {
                                this.errorManager.addError(error, 'generateLoop');
                                await this.logger.log(`生成循环中发生错误: ${error.message}`, 'ERROR');
                                // 继续生成
                                await new Promise(resolve => setTimeout(resolve, CONFIG.GENERATION_DELAY));
                            }
                        }
                        
                        await this.stop();
                    };
                    
                    // 启动生成循环
                    generateLoop();
                    
                } catch (error) {
                    this.errorManager.addError(error, 'start');
                    throw error;
                }
            }
            
            startHealthCheck() {
                if (MONITORING_CONFIG.ENABLE_HEALTH_CHECK) {
                    this.healthCheckInterval = setInterval(async () => {
                        try {
                            // 检查内存使用
                            this.memoryManager.checkMemoryUsage();
                            
                            // 检查文件大小
                            await this.fileManager.rotateLogFile();
                            
                            // 记录健康状态
                            await this.logger.log('健康检查通过', 'DEBUG');
                            
                        } catch (error) {
                            this.errorManager.addError(error, 'healthCheck');
                            await this.logger.log(`健康检查失败: ${error.message}`, 'ERROR');
                        }
                    }, MONITORING_CONFIG.HEALTH_CHECK_INTERVAL);
                }
            }
            
            startBackupTask() {
                if (FILES_CONFIG.AUTO_BACKUP) {
                    this.backupInterval = setInterval(async () => {
                        try {
                            await this.fileManager.backupOutputFile();
                        } catch (error) {
                            this.errorManager.addError(error, 'backupTask');
                            await this.logger.log(`备份任务失败: ${error.message}`, 'ERROR');
                        }
                    }, FILES_CONFIG.BACKUP_INTERVAL);
                }
            }
            
            startCheckpointTask() {
                if (RECOVERY_CONFIG.ENABLE_STATE_PERSISTENCE) {
                    this.checkpointInterval = setInterval(async () => {
                        try {
                            await this.stateManager.saveState();
                        } catch (error) {
                            this.errorManager.addError(error, 'checkpointTask');
                            await this.logger.log(`检查点保存失败: ${error.message}`, 'ERROR');
                        }
                    }, RECOVERY_CONFIG.SAVE_CHECKPOINT_INTERVAL);
                }
            }
            
            async stop() {
                this.isRunning = false;
                
                // 清理定时器
                if (this.batchProcessor) {
                    clearInterval(this.batchProcessor);
                    this.batchProcessor = null;
                }
                if (this.healthCheckInterval) {
                    clearInterval(this.healthCheckInterval);
                    this.healthCheckInterval = null;
                }
                if (this.backupInterval) {
                    clearInterval(this.backupInterval);
                    this.backupInterval = null;
                }
                if (this.checkpointInterval) {
                    clearInterval(this.checkpointInterval);
                    this.checkpointInterval = null;
                }
                
                // 保存最终状态
                if (RECOVERY_CONFIG.ENABLE_STATE_PERSISTENCE) {
                    await this.stateManager.saveState();
                }
                
                await this.logger.log('钱包生成已停止', 'INFO');
                await this.logger.log(`最终统计:`, 'INFO');
                await this.logger.progress();
                
                // 输出错误摘要
                const errorSummary = this.errorManager.getErrorSummary();
                if (errorSummary.errorCount > 0) {
                    await this.logger.log(`运行期间共发生 ${errorSummary.errorCount} 个错误`, 'WARN');
                }
            }
        }
        
        // 创建管理器实例
        const fileManager = new FileManager();
        const memoryManager = new MemoryManager();
        const errorManager = new ErrorManager();
        const stateManager = new StateManager();
        const logger = new Logger(fileManager);
        
        // 创建钱包生成器实例并启动
        const walletGenerator = new WalletGenerator(logger, fileManager, memoryManager, errorManager, stateManager);
        await walletGenerator.start();
        
        return { success: true, message: '钱包生成器已启动' };
        
    } catch (error) {
        console.error('启动失败:', error);
        return { success: false, error: error.message };
    }
}

// 停止函数
async function stop() {
    return { success: true, message: '停止功能需要在主进程中实现' };
}

// 获取统计信息
function getStats() {
    return { message: '统计信息需要在主进程中获取' };
}

module.exports = {
    start,
    stop,
    getStats
};

// 注册为 worker 模块
try {
    const workerpool = require('workerpool');
    workerpool.worker({ start, stop, getStats });
} catch (e) {
    // 非 worker 环境下忽略
} 