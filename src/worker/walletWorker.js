const fs = require('fs').promises;
const tronWallet = require('tron-wallet-hd');
const { pkToAddress } = require("@tronscan/client/src/utils/crypto");
const config = require('../config');

// 以下为原 child.js（已健壮性增强）的实现
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
        
        class StateManager {
            constructor() {
                this.stateFile = 'wallet_state.json';
                this.checkpointFile = 'wallet_checkpoint.json';
            }
            async saveState() {
                try {
                    const state = { stats: { ...stats }, timestamp: Date.now(), version: '1.0.0' };
                    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
                } catch (error) { console.error('保存状态失败:', error.message); }
            }
            async loadState() {
                try {
                    if (await fs.access(this.stateFile).then(() => true).catch(() => false)) {
                        const data = await fs.readFile(this.stateFile, 'utf8');
                        const state = JSON.parse(data);
                        if (state.stats && state.version === '1.0.0') { stats = { ...state.stats }; console.log('✅ 状态恢复成功'); return true; }
                    }
                } catch (error) { console.error('加载状态失败:', error.message); }
                return false;
            }
            async saveCheckpoint() {
                try {
                    const checkpoint = { stats: { ...stats }, timestamp: Date.now() };
                    await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
                    stats.lastCheckpoint = Date.now();
                } catch (error) { console.error('保存检查点失败:', error.message); }
            }
        }
        
        class FileManager {
            constructor() {
                this.outputFile = FILES_CONFIG.OUTPUT_FILE;
                this.logFile = FILES_CONFIG.LOG_FILE;
            }
            async checkFileSize(filePath) { try { const s = await fs.stat(filePath); return s.size; } catch { return 0; } }
            async rotateLogFile() {
                try {
                    const size = await this.checkFileSize(this.logFile);
                    if (size > FILES_CONFIG.MAX_LOG_SIZE) {
                        const ts = new Date().toISOString().replace(/[:.]/g, '-');
                        const backupFile = `${this.logFile}.${ts}`;
                        await fs.rename(this.logFile, backupFile);
                        console.log(`日志文件已轮转: ${backupFile}`);
                    }
                } catch (error) { console.error('日志文件轮转失败:', error.message); }
            }
            async backupOutputFile() {
                try {
                    if (FILES_CONFIG.AUTO_BACKUP) {
                        const ts = new Date().toISOString().replace(/[:.]/g, '-');
                        const backupFile = `${this.outputFile}.${ts}`;
                        if (await fs.access(this.outputFile).then(() => true).catch(() => false)) {
                            await fs.copyFile(this.outputFile, backupFile);
                            console.log(`输出文件已备份: ${backupFile}`);
                        }
                    }
                } catch (error) { console.error('输出文件备份失败:', error.message); }
            }
        }
        
        class MemoryManager {
            constructor() { this.lastGC = Date.now(); this.memoryThreshold = PERFORMANCE_CONFIG.MAX_MEMORY_USAGE; }
            checkMemoryUsage() { const u = process.memoryUsage(); const usage = (u.heapUsed/u.heapTotal); if (usage > this.memoryThreshold) { this.forceGarbageCollection(); return false; } return true; }
            forceGarbageCollection() { if (global.gc) { global.gc(); this.lastGC = Date.now(); console.log('🔄 强制垃圾回收已执行'); } }
            shouldPerformGC() { return (Date.now() - this.lastGC) > (config.PERFORMANCE.MEMORY_CHECK_INTERVAL * 2); }
        }
        
        class ErrorManager {
            constructor() { this.errors = []; this.maxErrors = MONITORING_CONFIG.MAX_ERROR_LOG_SIZE; }
            addError(error, context='') { const info = { message: error.message, stack: error.stack, context, timestamp: Date.now() }; this.errors.push(info); if (this.errors.length>this.maxErrors) this.errors = this.errors.slice(-this.maxErrors); this.logError(info); }
            async logError(info) { try { const line = `[${new Date(info.timestamp).toISOString()}] ERROR: ${info.message}\nContext: ${info.context}\nStack: ${info.stack}\n---\n`; await fs.appendFile('error.log', line); } catch (e) { console.error('写入错误日志失败:', e.message); } }
            getErrorSummary() { return { errorCount: this.errors.length, recentErrors: this.errors.slice(-10) }; }
        }
        
        class Logger {
            constructor(fileManager) { this.fileManager = fileManager; }
            async log(message, type='INFO') { const ts=new Date().toISOString(); const line=`[${ts}] [${type}] ${message}`; console.log(line); await this.fileManager.rotateLogFile(); try { await fs.appendFile(this.fileManager.logFile, line+'\n'); } catch(e) { console.error('写入日志文件失败:', e); } }
            async progress() {
                const now = Date.now();
                const elapsed = (now - stats.startTime) / 1000;
                const rate = stats.totalGenerated / Math.max(elapsed, 1);
                const eta = rate>0 ? (config.WALLET_GENERATION.MAX_WALLETS - stats.totalGenerated) / rate : 0;
                await this.log(`进度: ${stats.totalGenerated.toLocaleString()}/${config.WALLET_GENERATION.MAX_WALLETS.toLocaleString()} (${((stats.totalGenerated/config.WALLET_GENERATION.MAX_WALLETS)*100).toFixed(2)}%)`);
                await this.log(`生成速度: ${rate.toFixed(2)} 钱包/秒`);
                await this.log(`已匹配: ${stats.totalMatched} 个地址`);
                await this.log(`预计剩余时间: ${(eta/60).toFixed(2)} 分钟`);
                await this.log(`运行时间: ${(elapsed/60).toFixed(2)} 分钟`);
                const u=process.memoryUsage(); await this.log(`内存使用: ${(u.heapUsed/1024/1024).toFixed(2)}MB / ${(u.heapTotal/1024/1024).toFixed(2)}MB`);
                await this.log('---');
                stats.lastLogTime = now;
            }
        }
        
        class WalletGenerator {
            constructor(logger, fileManager, memoryManager, errorManager, stateManager) {
                this.logger=logger; this.fileManager=fileManager; this.memoryManager=memoryManager; this.errorManager=errorManager; this.stateManager=stateManager;
                this.isRunning=false; this.batchQueue=[]; this.processingBatch=false; this.batchProcessor=null; this.healthCheckInterval=null; this.backupInterval=null; this.checkpointInterval=null; this.retryCount=0;
            }
            async generateWallet() {
                try {
                    if (!this.memoryManager.checkMemoryUsage()) { await this.logger.log('内存使用过高，暂停生成','WARN'); await new Promise(r=>setTimeout(r,1000)); }
                    const mnemonic = tronWallet.utils.generateMnemonic();
                    const accounts = await tronWallet.utils.generateAccountsWithMnemonic(mnemonic, 1);
                    const privateKey = accounts[0].privateKey;
                    const address = pkToAddress(privateKey.replace(/^0x/, ''));
                    const suffix = address.substring(address.length - 6).toLowerCase();
                    const walletData = { address, mnemonic: SECURITY_CONFIG.LOG_SENSITIVE_DATA ? mnemonic : '[HIDDEN]', privateKey: SECURITY_CONFIG.LOG_SENSITIVE_DATA ? privateKey : '[HIDDEN]', timestamp: new Date().toISOString() };
                    const isMatch = config.WALLET_GENERATION.TARGET_SUFFIXES.some(s=>suffix.includes(s));
                    if (isMatch) { await this.saveMatchedWallet(walletData); stats.totalMatched++; await this.logger.log(`找到匹配地址: ${address} (后缀: ${suffix})`, 'SUCCESS'); }
                    stats.totalGenerated++;
                    return walletData;
                } catch (error) {
                    this.errorManager.addError(error, 'generateWallet');
                    await this.logger.log(`生成钱包时发生错误: ${error.message}`, 'ERROR');
                    if (this.retryCount < config.WALLET_GENERATION.MAX_RETRY_ATTEMPTS) { this.retryCount++; await this.logger.log(`重试第 ${this.retryCount} 次`, 'INFO'); await new Promise(r=>setTimeout(r, config.WALLET_GENERATION.RETRY_DELAY)); return this.generateWallet(); } else { this.retryCount=0; throw error; }
                }
            }
            async saveMatchedWallet(walletData) { try { const data=JSON.stringify(walletData,null,2)+'\n---\n'; await fs.appendFile(this.fileManager.outputFile, data); await this.logger.log(`已保存匹配钱包到 ${this.fileManager.outputFile}`, 'SUCCESS'); } catch (error) { this.errorManager.addError(error, 'saveMatchedWallet'); await this.logger.log(`保存钱包文件时发生错误: ${error.message}`,'ERROR'); throw error; } }
            async processBatch() {
                if (this.processingBatch || this.batchQueue.length===0) return;
                this.processingBatch=true; const batch=this.batchQueue.splice(0, Math.min(config.WALLET_GENERATION.BATCH_SIZE, this.batchQueue.length));
                try {
                    const batchPromise = Promise.allSettled(batch.map(()=>this.generateWallet()));
                    const timeoutPromise = new Promise((_,rej)=>setTimeout(()=>rej(new Error('批处理超时')), config.PERFORMANCE.BATCH_TIMEOUT));
                    await Promise.race([batchPromise, timeoutPromise]);
                    if (stats.totalGenerated % config.WALLET_GENERATION.LOG_INTERVAL === 0) { await this.logger.progress(); }
                    if (config.RECOVERY.ENABLE_STATE_PERSISTENCE && (Date.now()-stats.lastCheckpoint)>config.RECOVERY.SAVE_CHECKPOINT_INTERVAL) { await this.stateManager.saveCheckpoint(); }
                } catch (error) { this.errorManager.addError(error, 'processBatch'); await this.logger.log(`批量处理时发生错误: ${error.message}`, 'ERROR'); }
                finally { this.processingBatch=false; if (this.batchQueue.length>0) setTimeout(()=>this.processBatch(),0); }
            }
            async start() {
                try {
                    if (config.RECOVERY.ENABLE_STATE_PERSISTENCE) { await this.stateManager.loadState(); }
                    this.isRunning=true;
                    await this.logger.log('开始生成钱包...','INFO');
                    await this.logger.log(`目标后缀: ${config.WALLET_GENERATION.TARGET_SUFFIXES.join(', ')}`,'INFO');
                    await this.logger.log(`生成延迟: ${config.WALLET_GENERATION.GENERATION_DELAY}ms`,'INFO');
                    await this.logger.log(`批量大小: ${config.WALLET_GENERATION.BATCH_SIZE}`,'INFO');
                    await this.logger.log('---','INFO');
                    this.startHealthCheck(); this.startBackupTask(); this.startCheckpointTask();
                    const generateWithDelay = async () => {
                        if (!this.isRunning || stats.totalGenerated >= config.WALLET_GENERATION.MAX_WALLETS) { await this.stop(); return; }
                        try {
                            if (this.batchQueue.length < config.PERFORMANCE.QUEUE_MAX_SIZE) this.batchQueue.push(Date.now()); else await this.logger.log('队列已满，等待处理','WARN');
                            if (this.batchQueue.length >= config.WALLET_GENERATION.BATCH_SIZE && !this.processingBatch) await this.processBatch();
                            setTimeout(generateWithDelay, config.WALLET_GENERATION.GENERATION_DELAY);
                        } catch (error) { this.errorManager.addError(error, 'generateWithDelay'); await this.logger.log(`生成过程中发生错误: ${error.message}`, 'ERROR'); setTimeout(generateWithDelay, config.WALLET_GENERATION.GENERATION_DELAY); }
                    };
                    generateWithDelay();
                    this.batchProcessor=setInterval(async()=>{ if(this.isRunning && this.batchQueue.length>0 && !this.processingBatch){ await this.processBatch(); } },100);
                } catch (error) { this.errorManager.addError(error, 'start'); throw error; }
            }
            startHealthCheck() { if (config.MONITORING.ENABLE_HEALTH_CHECK) { this.healthCheckInterval=setInterval(async()=>{ try { this.memoryManager.checkMemoryUsage(); await this.fileManager.rotateLogFile(); await this.logger.log('健康检查通过','DEBUG'); } catch (error) { this.errorManager.addError(error, 'healthCheck'); await this.logger.log(`健康检查失败: ${error.message}`,'ERROR'); } }, config.MONITORING.HEALTH_CHECK_INTERVAL); } }
            startBackupTask() { if (config.FILES.AUTO_BACKUP) { this.backupInterval=setInterval(async()=>{ try { await this.fileManager.backupOutputFile(); } catch (error) { this.errorManager.addError(error,'backupTask'); await this.logger.log(`备份任务失败: ${error.message}`,'ERROR'); } }, config.FILES.BACKUP_INTERVAL); } }
            startCheckpointTask() { if (config.RECOVERY.ENABLE_STATE_PERSISTENCE) { this.checkpointInterval=setInterval(async()=>{ try { await this.stateManager.saveState(); } catch (error) { this.errorManager.addError(error,'checkpointTask'); await this.logger.log(`检查点保存失败: ${error.message}`,'ERROR'); } }, config.RECOVERY.SAVE_CHECKPOINT_INTERVAL); } }
            async stop() { this.isRunning=false; if(this.batchProcessor){clearInterval(this.batchProcessor); this.batchProcessor=null;} if(this.healthCheckInterval){clearInterval(this.healthCheckInterval); this.healthCheckInterval=null;} if(this.backupInterval){clearInterval(this.backupInterval); this.backupInterval=null;} if(this.checkpointInterval){clearInterval(this.checkpointInterval); this.checkpointInterval=null;} if(this.batchQueue.length>0){ await this.processBatch(); } if (config.RECOVERY.ENABLE_STATE_PERSISTENCE){ await this.stateManager.saveState(); } await this.logger.log('钱包生成已停止','INFO'); await this.logger.log(`最终统计:`,'INFO'); await this.logger.progress(); const summary=this.errorManager.getErrorSummary(); if(summary.errorCount>0){ await this.logger.log(`运行期间共发生 ${summary.errorCount} 个错误`,'WARN'); } }
        }
        
        const fileManager = new FileManager();
        const memoryManager = new MemoryManager();
        const errorManager = new ErrorManager();
        const stateManager = new StateManager();
        const logger = new Logger(fileManager);
        const walletGenerator = new WalletGenerator(logger, fileManager, memoryManager, errorManager, stateManager);
        await walletGenerator.start();
        return { success: true, message: '钱包生成器已启动' };
    } catch (error) { console.error('启动失败:', error); return { success: false, error: error.message }; }
}

async function stop() { return { success: true, message: '停止功能需要在主进程中实现' }; }
function getStats() { return { message: '统计信息需要在主进程中获取' }; }

module.exports = { start, stop, getStats };

try { const workerpool = require('workerpool'); workerpool.worker({ start, stop, getStats }); } catch (e) {} 