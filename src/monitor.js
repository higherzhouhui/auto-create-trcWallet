const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class SystemMonitor {
    constructor() {
        this.isMonitoring = false;
        this.monitorInterval = null;
        this.performanceInterval = null;
        this.alertThresholds = { memory: 0.85, cpu: 0.8, disk: 0.9 };
        this.alerts = [];
        this.maxAlerts = 100;
    }
    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        console.log('🚀 系统监控已启动...\n');
        this.monitorInterval = setInterval(() => { this.displaySystemInfo(); this.checkAlerts(); console.log('---'); }, 10000);
        if (this.shouldEnablePerformanceMonitoring()) { this.performanceInterval = setInterval(() => { this.logPerformanceMetrics(); }, 60000); }
    }
    stop() {
        if (this.monitorInterval) { clearInterval(this.monitorInterval); this.monitorInterval = null; }
        if (this.performanceInterval) { clearInterval(this.performanceInterval); this.performanceInterval = null; }
        this.isMonitoring = false;
        console.log('🛑 系统监控已停止');
    }
    shouldEnablePerformanceMonitoring() { try { const config = require('./config'); return config.MONITORING.ENABLE_PERFORMANCE_MONITORING; } catch { return true; } }
    async displaySystemInfo() {
        const totalMem = os.totalmem(); const freeMem = os.freemem(); const usedMem = totalMem - freeMem; const memUsage = (usedMem / totalMem * 100).toFixed(2);
        const cpuLoad = os.loadavg(); const cpuCores = os.cpus().length;
        console.log('=== 系统信息 ===');
        console.log(`内存使用: ${(usedMem/1024/1024/1024).toFixed(2)}GB / ${(totalMem/1024/1024/1024).toFixed(2)}GB (${memUsage}%)`);
        console.log(`CPU负载: 1分钟: ${cpuLoad[0].toFixed(2)}, 5分钟: ${cpuLoad[1].toFixed(2)}, 15分钟: ${cpuLoad[2].toFixed(2)}`);
        console.log(`CPU核心数: ${cpuCores}`);
        console.log(`平台: ${os.platform()} ${os.arch()}`);
        console.log(`Node.js版本: ${process.version}`);
        console.log(`进程ID: ${process.pid}`);
        console.log(`运行时间: ${this.formatUptime(process.uptime())}`);
        await this.checkDiskSpace();
        await this.checkFileStatus();
    }
    async checkDiskSpace() { try { const currentDir = process.cwd(); await fs.stat(currentDir); console.log(`当前目录: ${currentDir}`); } catch (e) { console.log(`磁盘空间检查失败: ${e.message}`); } }
    async checkFileStatus() {
        try {
            const files = ['app.log', 'private.json', 'error.log', 'wallet_state.json'];
            console.log('\n=== 文件状态 ===');
            for (const file of files) { try { const s = await fs.stat(file); const size=(s.size/1024).toFixed(2); const modified=new Date(s.mtime).toLocaleString(); console.log(`${file}: ${size}KB, 修改时间: ${modified}`); } catch { console.log(`${file}: 不存在`); } }
        } catch (e) { console.log(`文件状态检查失败: ${e.message}`); }
    }
    async displayWalletStats() {
        try {
            const stateFile = 'wallet_state.json';
            if (await fs.access(stateFile).then(()=>true).catch(()=>false)) { const data = await fs.readFile(stateFile,'utf8'); const state = JSON.parse(data); if (state.stats) { const stats=state.stats; const now=Date.now(); const elapsed=(now-stats.startTime)/1000; const rate=stats.totalGenerated>0?stats.totalGenerated/elapsed:0; console.log('\n=== 钱包生成统计 ==='); console.log(`总生成数量: ${stats.totalGenerated.toLocaleString()}`); console.log(`匹配数量: ${stats.totalMatched.toLocaleString()}`); console.log(`生成速度: ${rate.toFixed(2)} 钱包/秒`); console.log(`运行时间: ${(elapsed/60).toFixed(2)} 分钟`); if (stats.totalGenerated>0){ const matchRate=(stats.totalMatched/stats.totalGenerated*100).toFixed(6); console.log(`匹配率: ${matchRate}%`);} if (stats.errors && stats.errors.length>0){ console.log(`错误数量: ${stats.errors.length}`);} } } else { console.log('\n=== 钱包生成统计 ==='); console.log('状态文件不存在，无法获取统计信息'); }
        } catch (e) { console.log(`获取钱包统计信息失败: ${e.message}`); }
    }
    checkAlerts() { const totalMem=os.totalmem(); const freeMem=os.freemem(); const memUsage=(totalMem-freeMem)/totalMem; const cpuLoad=os.loadavg(); const cpuUsage=cpuLoad[0]/os.cpus().length; if (memUsage>this.alertThresholds.memory) this.addAlert('MEMORY',`内存使用率过高: ${(memUsage*100).toFixed(2)}%`); if (cpuUsage>this.alertThresholds.cpu) this.addAlert('CPU',`CPU使用率过高: ${(cpuUsage*100).toFixed(2)}%`); if (this.alerts.length>0){ console.log('\n⚠️  系统告警:'); this.alerts.slice(-5).forEach(a=>console.log(`[${new Date(a.timestamp).toLocaleTimeString()}] ${a.type}: ${a.message}`)); } }
    addAlert(type,message){ const alert={type,message,timestamp:Date.now()}; this.alerts.push(alert); if(this.alerts.length>this.maxAlerts) this.alerts=this.alerts.slice(-this.maxAlerts); this.logAlert(alert); }
    async logAlert(alert){ try { const line=`[${new Date(alert.timestamp).toISOString()}] ALERT: ${alert.type} - ${alert.message}\n`; await fs.appendFile('system_alerts.log', line); } catch(e){ console.error('记录告警失败:', e.message); } }
    async logPerformanceMetrics(){ try { const metrics={ timestamp:Date.now(), memory:process.memoryUsage(), cpu:os.loadavg(), uptime:process.uptime(), platform:os.platform(), arch:os.arch() }; await fs.appendFile('performance_metrics.log', JSON.stringify(metrics)+'\n'); console.log('📊 性能指标已记录'); } catch(e){ console.error('记录性能指标失败:', e.message); } }
    formatUptime(seconds){ const d=Math.floor(seconds/86400), h=Math.floor((seconds%86400)/3600), m=Math.floor((seconds%3600)/60), s=Math.floor(seconds%60); if(d>0) return `${d}天 ${h}小时 ${m}分钟`; if(h>0) return `${h}小时 ${m}分钟`; if(m>0) return `${m}分钟 ${s}秒`; return `${s}秒`; }
    getHealthScore(){ const totalMem=os.totalmem(); const freeMem=os.freemem(); const memUsage=(totalMem-freeMem)/totalMem; const cpuLoad=os.loadavg(); const cpuUsage=cpuLoad[0]/os.cpus().length; let score=100; if(memUsage>0.8) score-=20; else if(memUsage>0.6) score-=10; if(cpuUsage>0.8) score-=20; else if(cpuUsage>0.6) score-=10; score-=Math.min(this.alerts.length*2,20); return Math.max(score,0); }
}

if (require.main === module) {
    const monitor = new SystemMonitor();
    monitor.start();
    process.on('SIGINT', () => { console.log('\n🔄 正在停止监控...'); monitor.stop(); process.exit(0); });
    process.on('SIGTERM', () => { console.log('\n🔄 收到终止信号，正在停止监控...'); monitor.stop(); process.exit(0); });
    setInterval(() => { const score = monitor.getHealthScore(); const emoji = score>=80?'🟢':score>=60?'🟡':'🔴'; console.log(`\n${emoji} 系统健康评分: ${score}/100`); }, 30000);
}

module.exports = SystemMonitor; 