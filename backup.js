const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

class BackupManager {
    constructor() {
        this.backupDir = 'backups';
        this.config = config.FILES;
        this.ensureBackupDirectory();
    }
    
    async ensureBackupDirectory() {
        try {
            await fs.access(this.backupDir);
        } catch (error) {
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log(`✅ 创建备份目录: ${this.backupDir}`);
        }
    }
    
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${timestamp}`;
        const backupPath = path.join(this.backupDir, backupName);
        
        try {
            await fs.mkdir(backupPath, { recursive: true });
            console.log(`🔄 开始创建备份: ${backupName}`);
            
            const filesToBackup = [
                'private.json',
                'app.log',
                'error.log',
                'wallet_state.json',
                'wallet_checkpoint.json'
            ];
            
            let backupCount = 0;
            for (const file of filesToBackup) {
                try {
                    if (await fs.access(file).then(() => true).catch(() => false)) {
                        const sourcePath = file;
                        const destPath = path.join(backupPath, file);
                        await fs.copyFile(sourcePath, destPath);
                        backupCount++;
                        console.log(`✅ 备份文件: ${file}`);
                    }
                } catch (error) {
                    console.log(`⚠️  跳过文件: ${file} (${error.message})`);
                }
            }
            
            // 创建备份信息文件
            const backupInfo = {
                timestamp: Date.now(),
                files: backupCount,
                version: '1.0.0',
                config: {
                    targetSuffixes: config.WALLET_GENERATION.TARGET_SUFFIXES,
                    maxWallets: config.WALLET_GENERATION.MAX_WALLETS
                }
            };
            
            await fs.writeFile(
                path.join(backupPath, 'backup-info.json'),
                JSON.stringify(backupInfo, null, 2)
            );
            
            console.log(`✅ 备份完成: ${backupName} (${backupCount} 个文件)`);
            return backupPath;
            
        } catch (error) {
            console.error(`❌ 备份失败: ${error.message}`);
            throw error;
        }
    }
    
    async listBackups() {
        try {
            const items = await fs.readdir(this.backupDir);
            const backups = [];
            
            for (const item of items) {
                const itemPath = path.join(this.backupDir, item);
                const stats = await fs.stat(itemPath);
                
                if (stats.isDirectory()) {
                    try {
                        const infoPath = path.join(itemPath, 'backup-info.json');
                        if (await fs.access(infoPath).then(() => true).catch(() => false)) {
                            const info = JSON.parse(await fs.readFile(infoPath, 'utf8'));
                            backups.push({
                                name: item,
                                path: itemPath,
                                timestamp: info.timestamp,
                                files: info.files,
                                size: await this.getDirectorySize(itemPath)
                            });
                        }
                    } catch (error) {
                        // 忽略损坏的备份信息
                    }
                }
            }
            
            return backups.sort((a, b) => b.timestamp - a.timestamp);
            
        } catch (error) {
            console.error(`❌ 列出备份失败: ${error.message}`);
            return [];
        }
    }
    
    async getDirectorySize(dirPath) {
        try {
            const items = await fs.readdir(dirPath);
            let totalSize = 0;
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = await fs.stat(itemPath);
                
                if (stats.isFile()) {
                    totalSize += stats.size;
                } else if (stats.isDirectory()) {
                    totalSize += await this.getDirectorySize(itemPath);
                }
            }
            
            return totalSize;
        } catch (error) {
            return 0;
        }
    }
    
    async restoreBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);
            
            if (!(await fs.access(backupPath).then(() => true).catch(() => false))) {
                throw new Error(`备份不存在: ${backupName}`);
            }
            
            console.log(`🔄 开始恢复备份: ${backupName}`);
            
            // 创建恢复前的备份
            await this.createBackup();
            
            const filesToRestore = [
                'private.json',
                'app.log',
                'error.log',
                'wallet_state.json',
                'wallet_checkpoint.json'
            ];
            
            let restoreCount = 0;
            for (const file of filesToRestore) {
                try {
                    const sourcePath = path.join(backupPath, file);
                    if (await fs.access(sourcePath).then(() => true).catch(() => false)) {
                        await fs.copyFile(sourcePath, file);
                        restoreCount++;
                        console.log(`✅ 恢复文件: ${file}`);
                    }
                } catch (error) {
                    console.log(`⚠️  跳过文件: ${file} (${error.message})`);
                }
            }
            
            console.log(`✅ 恢复完成: ${backupName} (${restoreCount} 个文件)`);
            return restoreCount;
            
        } catch (error) {
            console.error(`❌ 恢复失败: ${error.message}`);
            throw error;
        }
    }
    
    async cleanupOldBackups(maxBackups = 10) {
        try {
            const backups = await this.listBackups();
            
            if (backups.length <= maxBackups) {
                console.log(`✅ 备份数量在限制内 (${backups.length}/${maxBackups})`);
                return;
            }
            
            const toDelete = backups.slice(maxBackups);
            console.log(`🔄 开始清理 ${toDelete.length} 个旧备份...`);
            
            for (const backup of toDelete) {
                try {
                    await fs.rm(backup.path, { recursive: true, force: true });
                    console.log(`🗑️  删除备份: ${backup.name}`);
                } catch (error) {
                    console.log(`⚠️  删除失败: ${backup.name} (${error.message})`);
                }
            }
            
            console.log(`✅ 清理完成，保留 ${maxBackups} 个最新备份`);
            
        } catch (error) {
            console.error(`❌ 清理失败: ${error.message}`);
        }
    }
    
    async compressBackup(backupName) {
        // 这里可以添加压缩功能
        // 在Node.js中可以使用zlib或其他压缩库
        console.log(`📦 压缩功能待实现: ${backupName}`);
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async displayBackupStatus() {
        try {
            const backups = await this.listBackups();
            
            console.log('\n=== 备份状态 ===');
            console.log(`备份目录: ${path.resolve(this.backupDir)}`);
            console.log(`备份数量: ${backups.length}`);
            
            if (backups.length > 0) {
                console.log('\n最新备份:');
                const latest = backups[0];
                console.log(`  ${latest.name}`);
                console.log(`  时间: ${new Date(latest.timestamp).toLocaleString()}`);
                console.log(`  文件数: ${latest.files}`);
                console.log(`  大小: ${this.formatBytes(latest.size)}`);
            }
            
            // 检查磁盘空间
            await this.checkDiskSpace();
            
        } catch (error) {
            console.error(`❌ 显示备份状态失败: ${error.message}`);
        }
    }
    
    async checkDiskSpace() {
        try {
            const currentDir = process.cwd();
            const stats = await fs.stat(currentDir);
            console.log(`\n当前目录: ${currentDir}`);
            
            // 这里可以添加更详细的磁盘空间检查
            // 在Windows上可能需要使用其他方法
            
        } catch (error) {
            console.log(`磁盘空间检查失败: ${error.message}`);
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const backupManager = new BackupManager();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            backupManager.createBackup().catch(console.error);
            break;
            
        case 'list':
            backupManager.listBackups().then(backups => {
                console.log('\n=== 可用备份 ===');
                backups.forEach((backup, index) => {
                    console.log(`${index + 1}. ${backup.name}`);
                    console.log(`   时间: ${new Date(backup.timestamp).toLocaleString()}`);
                    console.log(`   文件数: ${backup.files}`);
                    console.log(`   大小: ${backupManager.formatBytes(backup.size)}`);
                    console.log('');
                });
            }).catch(console.error);
            break;
            
        case 'restore':
            const backupName = process.argv[3];
            if (!backupName) {
                console.log('❌ 请指定要恢复的备份名称');
                console.log('用法: node backup.js restore <backup-name>');
                process.exit(1);
            }
            backupManager.restoreBackup(backupName).catch(console.error);
            break;
            
        case 'cleanup':
            const maxBackups = parseInt(process.argv[3]) || 10;
            backupManager.cleanupOldBackups(maxBackups).catch(console.error);
            break;
            
        case 'status':
            backupManager.displayBackupStatus().catch(console.error);
            break;
            
        default:
            console.log('TRON 钱包备份管理器');
            console.log('');
            console.log('用法:');
            console.log('  node backup.js create          - 创建新备份');
            console.log('  node backup.js list            - 列出所有备份');
            console.log('  node backup.js restore <name>  - 恢复指定备份');
            console.log('  node backup.js cleanup [max]   - 清理旧备份 (默认保留10个)');
            console.log('  node backup.js status          - 显示备份状态');
            console.log('');
            console.log('示例:');
            console.log('  node backup.js create');
            console.log('  node backup.js restore backup-2024-01-01T12-00-00-000Z');
            console.log('  node backup.js cleanup 5');
    }
}

module.exports = BackupManager; 