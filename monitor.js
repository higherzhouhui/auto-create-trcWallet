const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class SystemMonitor {
    constructor() {
        this.isMonitoring = false;
        this.monitorInterval = null;
        this.performanceInterval = null;
        this.alertThresholds = {
            memory: 0.85, // 内存使用率阈值
            cpu: 0.8,     // CPU使用率阈值
            disk: 0.9     // 磁盘使用率阈值
        };
        this.alerts = [];
        this.maxAlerts = 100;
    }
    
    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('🚀 系统监控已启动...\n');
        
        // 基础监控
        this.monitorInterval = setInterval(() => {
            this.displaySystemInfo();
            this.checkAlerts();
            console.log('---');
        }, 10000); // 每10秒更新一次
        
        // 性能监控
        if (this.shouldEnablePerformanceMonitoring()) {
            this.performanceInterval = setInterval(() => {
                this.logPerformanceMetrics();
            }, 60000); // 每1分钟记录一次性能指标
        }
    }
    
    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
        this.isMonitoring = false;
        console.log('🛑 系统监控已停止');
    }
    
    shouldEnablePerformanceMonitoring() {
        try {
            const config = require('./config');
            return config.MONITORING.ENABLE_PERFORMANCE_MONITORING;
        } catch (error) {
            return true; // 默认启用
        }
    }
    
    async displaySystemInfo() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = (usedMem / totalMem * 100).toFixed(2);
        
        const cpuLoad = os.loadavg();
        const cpuCores = os.cpus().length;
        
        console.log('=== 系统信息 ===');
        console.log(`内存使用: ${(usedMem / 1024 / 1024 / 1024).toFixed(2)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(2)}GB (${memUsage}%)`);
        console.log(`CPU负载: 1分钟: ${cpuLoad[0].toFixed(2)}, 5分钟: ${cpuLoad[1].toFixed(2)}, 15分钟: ${cpuLoad[2].toFixed(2)}`);
        console.log(`CPU核心数: ${cpuCores}`);
        console.log(`平台: ${os.platform()} ${os.arch()}`);
        console.log(`Node.js版本: ${process.version}`);
        console.log(`进程ID: ${process.pid}`);
        console.log(`运行时间: ${this.formatUptime(process.uptime())}`);
        
        // 检查磁盘空间
        await this.checkDiskSpace();
        
        // 检查文件状态
        await this.checkFileStatus();
    }
    
    async checkDiskSpace() {
        try {
            const currentDir = process.cwd();
            const stats = await fs.stat(currentDir);
            console.log(`当前目录: ${currentDir}`);
            
            // 这里可以添加更详细的磁盘空间检查
            // 在Windows上可能需要使用其他方法
        } catch (error) {
            console.log(`磁盘空间检查失败: ${error.message}`);
        }
    }
    
    async checkFileStatus() {
        try {
            const files = ['app.log', 'private.json', 'error.log', 'wallet_state.json'];
            console.log('\n=== 文件状态 ===');
            
            for (const file of files) {
                try {
                    const stats = await fs.stat(file);
                    const size = (stats.size / 1024).toFixed(2);
                    const modified = new Date(stats.mtime).toLocaleString();
                    console.log(`${file}: ${size}KB, 修改时间: ${modified}`);
                } catch (error) {
                    console.log(`${file}: 不存在`);
                }
            }
        } catch (error) {
            console.log(`文件状态检查失败: ${error.message}`);
        }
    }
    
    async displayWalletStats() {
        try {
            // 尝试从状态文件读取统计信息
            const stateFile = 'wallet_state.json';
            if (await fs.access(stateFile).then(() => true).catch(() => false)) {
                const data = await fs.readFile(stateFile, 'utf8');
                const state = JSON.parse(data);
                
                if (state.stats) {
                    const stats = state.stats;
                    const now = Date.now();
                    const elapsed = (now - stats.startTime) / 1000;
                    const rate = stats.totalGenerated > 0 ? stats.totalGenerated / elapsed : 0;
                    
                    console.log('\n=== 钱包生成统计 ===');
                    console.log(`总生成数量: ${stats.totalGenerated.toLocaleString()}`);
                    console.log(`匹配数量: ${stats.totalMatched.toLocaleString()}`);
                    console.log(`生成速度: ${rate.toFixed(2)} 钱包/秒`);
                    console.log(`运行时间: ${(elapsed / 60).toFixed(2)} 分钟`);
                    
                    if (stats.totalGenerated > 0) {
                        const matchRate = (stats.totalMatched / stats.totalGenerated * 100).toFixed(6);
                        console.log(`匹配率: ${matchRate}%`);
                    }
                    
                    if (stats.errors && stats.errors.length > 0) {
                        console.log(`错误数量: ${stats.errors.length}`);
                    }
                }
            } else {
                console.log('\n=== 钱包生成统计 ===');
                console.log('状态文件不存在，无法获取统计信息');
            }
        } catch (error) {
            console.log(`获取钱包统计信息失败: ${error.message}`);
        }
    }
    
    checkAlerts() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = (totalMem - freeMem) / totalMem;
        
        const cpuLoad = os.loadavg();
        const cpuUsage = cpuLoad[0] / os.cpus().length;
        
        // 内存告警
        if (memUsage > this.alertThresholds.memory) {
            this.addAlert('MEMORY', `内存使用率过高: ${(memUsage * 100).toFixed(2)}%`);
        }
        
        // CPU告警
        if (cpuUsage > this.alertThresholds.cpu) {
            this.addAlert('CPU', `CPU使用率过高: ${(cpuUsage * 100).toFixed(2)}%`);
        }
        
        // 显示告警
        if (this.alerts.length > 0) {
            console.log('\n⚠️  系统告警:');
            const recentAlerts = this.alerts.slice(-5);
            recentAlerts.forEach(alert => {
                console.log(`[${new Date(alert.timestamp).toLocaleTimeString()}] ${alert.type}: ${alert.message}`);
            });
        }
    }
    
    addAlert(type, message) {
        const alert = {
            type,
            message,
            timestamp: Date.now()
        };
        
        this.alerts.push(alert);
        
        // 限制告警数量
        if (this.alerts.length > this.maxAlerts) {
            this.alerts = this.alerts.slice(-this.maxAlerts);
        }
        
        // 记录告警到文件
        this.logAlert(alert);
    }
    
    async logAlert(alert) {
        try {
            const alertLog = `[${new Date(alert.timestamp).toISOString()}] ALERT: ${alert.type} - ${alert.message}\n`;
            await fs.appendFile('system_alerts.log', alertLog);
        } catch (error) {
            console.error('记录告警失败:', error.message);
        }
    }
    
    async logPerformanceMetrics() {
        try {
            const metrics = {
                timestamp: Date.now(),
                memory: process.memoryUsage(),
                cpu: os.loadavg(),
                uptime: process.uptime(),
                platform: os.platform(),
                arch: os.arch()
            };
            
            const metricsLog = JSON.stringify(metrics) + '\n';
            await fs.appendFile('performance_metrics.log', metricsLog);
            
            console.log('📊 性能指标已记录');
        } catch (error) {
            console.error('记录性能指标失败:', error.message);
        }
    }
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (days > 0) {
            return `${days}天 ${hours}小时 ${minutes}分钟`;
        } else if (hours > 0) {
            return `${hours}小时 ${minutes}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟 ${secs}秒`;
        } else {
            return `${secs}秒`;
        }
    }
    
    // 获取系统健康评分
    getHealthScore() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = (totalMem - freeMem) / totalMem;
        
        const cpuLoad = os.loadavg();
        const cpuUsage = cpuLoad[0] / os.cpus().length;
        
        let score = 100;
        
        // 内存扣分
        if (memUsage > 0.8) score -= 20;
        else if (memUsage > 0.6) score -= 10;
        
        // CPU扣分
        if (cpuUsage > 0.8) score -= 20;
        else if (cpuUsage > 0.6) score -= 10;
        
        // 告警扣分
        score -= Math.min(this.alerts.length * 2, 20);
        
        return Math.max(score, 0);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const monitor = new SystemMonitor();
    
    // 启动监控
    monitor.start();
    
    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n🔄 正在停止监控...');
        monitor.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n🔄 收到终止信号，正在停止监控...');
        monitor.stop();
        process.exit(0);
    });
    
    // 定期显示健康评分
    setInterval(() => {
        const score = monitor.getHealthScore();
        const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
        console.log(`\n${emoji} 系统健康评分: ${score}/100`);
    }, 30000);
}

module.exports = SystemMonitor; 