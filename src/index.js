const WorkerPool = require('workerpool').pool;
const path = require('path');
const config = require('./config');
 
// 创建线程池，指定 worker 脚本文件
const workerFile = path.join(__dirname, 'worker', 'walletWorker.js');
const pool = WorkerPool(workerFile, { 
    maxWorkers: config.WORKER_POOL.MAX_WORKERS,
    workerTimeout: config.WORKER_POOL.WORKER_TIMEOUT
});

console.log('🚀 正在启动 TRON 钱包生成器...');
console.log(`📊 线程池大小: ${config.WORKER_POOL.MAX_WORKERS}`);
console.log(`⏱️  工作线程超时: ${config.WORKER_POOL.WORKER_TIMEOUT}ms`);
console.log('---');

// 启动钱包生成器（调用 worker 暴露的方法名）
pool.exec('start').then((result) => {
    if (result && result.success) {
        console.log('✅ 钱包生成器启动成功!');
        console.log(`📝 ${result.message}`);
        console.log('💡 程序正在运行中，使用 Ctrl+C 停止');
    } else {
        console.error('❌ 钱包生成器启动失败:', result?.error || 'Unknown error');
        process.exit(1);
    }
}).catch((error) => {
    console.error('❌ Worker pool 执行失败:', error);
    process.exit(1);
});

// 优雅关闭处理
process.on('SIGINT', async () => {
    console.log('\n🔄 正在关闭线程池...');
    try {
        await pool.terminate();
        console.log('✅ 线程池已关闭');
        process.exit(0);
    } catch (error) {
        console.error('❌ 关闭线程池时发生错误:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 收到终止信号，正在关闭线程池...');
    try {
        await pool.terminate();
        console.log('✅ 线程池已关闭');
        process.exit(0);
    } catch (error) {
        console.error('❌ 关闭线程池时发生错误:', error);
        process.exit(1);
    }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
    process.exit(1);
});

// 添加简单的健康检查
setInterval(() => {
    console.log('💓 程序运行中...');
}, 30000); // 每30秒输出一次心跳 