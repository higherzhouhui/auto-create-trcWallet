const fs = require('fs').promises;
const path = require('path');
const config = require('../src/config');

class BackupManager {
    constructor() { this.backupDir = 'backups'; this.config = config.FILES; this.ensureBackupDirectory(); }
    async ensureBackupDirectory(){ try { await fs.access(this.backupDir); } catch { await fs.mkdir(this.backupDir,{recursive:true}); console.log(`✅ 创建备份目录: ${this.backupDir}`); } }
    async createBackup(){ const ts=new Date().toISOString().replace(/[:.]/g,'-'); const name=`backup-${ts}`; const dir=path.join(this.backupDir,name); try { await fs.mkdir(dir,{recursive:true}); console.log(`🔄 开始创建备份: ${name}`); const files=['private.json','app.log','error.log','wallet_state.json','wallet_checkpoint.json']; let n=0; for(const f of files){ try{ if(await fs.access(f).then(()=>true).catch(()=>false)){ await fs.copyFile(f, path.join(dir,f)); n++; console.log(`✅ 备份文件: ${f}`);} }catch(e){ console.log(`⚠️  跳过文件: ${f} (${e.message})`);} } const info={ timestamp:Date.now(), files:n, version:'1.0.0', config:{ targetSuffixes: config.WALLET_GENERATION.TARGET_SUFFIXES, maxWallets: config.WALLET_GENERATION.MAX_WALLETS } }; await fs.writeFile(path.join(dir,'backup-info.json'), JSON.stringify(info,null,2)); console.log(`✅ 备份完成: ${name} (${n} 个文件)`); return dir; } catch(e){ console.error(`❌ 备份失败: ${e.message}`); throw e; } }
    async listBackups(){ try { const items=await fs.readdir(this.backupDir); const arr=[]; for(const it of items){ const p=path.join(this.backupDir,it); const s=await fs.stat(p); if(s.isDirectory()){ try{ const infoPath=path.join(p,'backup-info.json'); if(await fs.access(infoPath).then(()=>true).catch(()=>false)){ const info=JSON.parse(await fs.readFile(infoPath,'utf8')); arr.push({ name:it, path:p, timestamp:info.timestamp, files:info.files, size: await this.dirSize(p) }); } } catch{} } } return arr.sort((a,b)=>b.timestamp-a.timestamp); } catch(e){ console.error(`❌ 列出备份失败: ${e.message}`); return []; } }
    async dirSize(dir){ try{ const items=await fs.readdir(dir); let sum=0; for(const it of items){ const p=path.join(dir,it); const s=await fs.stat(p); if(s.isFile()) sum+=s.size; else if(s.isDirectory()) sum+=await this.dirSize(p); } return sum; } catch{ return 0; } }
    async restoreBackup(name){ try{ const dir=path.join(this.backupDir,name); if(!(await fs.access(dir).then(()=>true).catch(()=>false))) throw new Error(`备份不存在: ${name}`); console.log(`🔄 开始恢复备份: ${name}`); await this.createBackup(); const files=['private.json','app.log','error.log','wallet_state.json','wallet_checkpoint.json']; let n=0; for(const f of files){ try{ const src=path.join(dir,f); if(await fs.access(src).then(()=>true).catch(()=>false)){ await fs.copyFile(src, f); n++; console.log(`✅ 恢复文件: ${f}`); } }catch(e){ console.log(`⚠️  跳过文件: ${f} (${e.message})`);} } console.log(`✅ 恢复完成: ${name} (${n} 个文件)`); return n; } catch(e){ console.error(`❌ 恢复失败: ${e.message}`); throw e; } }
    async cleanupOldBackups(maxBackups=10){ try{ const list=await this.listBackups(); if(list.length<=maxBackups){ console.log(`✅ 备份数量在限制内 (${list.length}/${maxBackups})`); return; } const del=list.slice(maxBackups); console.log(`🔄 开始清理 ${del.length} 个旧备份...`); for(const b of del){ try{ await fs.rm(b.path,{recursive:true, force:true}); console.log(`🗑️  删除备份: ${b.name}`);} catch(e){ console.log(`⚠️  删除失败: ${b.name} (${e.message})`);} } console.log(`✅ 清理完成，保留 ${maxBackups} 个最新备份`); } catch(e){ console.error(`❌ 清理失败: ${e.message}`); } }
    async displayBackupStatus(){ try{ const list=await this.listBackups(); console.log('\n=== 备份状态 ==='); console.log(`备份目录: ${path.resolve(this.backupDir)}`); console.log(`备份数量: ${list.length}`); if(list.length>0){ const latest=list[0]; console.log('\n最新备份:'); console.log(`  ${latest.name}`); console.log(`  时间: ${new Date(latest.timestamp).toLocaleString()}`); console.log(`  文件数: ${latest.files}`); console.log(`  大小: ${this.formatBytes(latest.size)}`);} await this.checkDiskSpace(); } catch(e){ console.error(`❌ 显示备份状态失败: ${e.message}`);} }
    async checkDiskSpace(){ try{ const dir=process.cwd(); await fs.stat(dir); console.log(`\n当前目录: ${dir}`);} catch(e){ console.log(`磁盘空间检查失败: ${e.message}`);} }
    formatBytes(bytes){ if(bytes===0) return '0 Bytes'; const k=1024, sizes=['Bytes','KB','MB','GB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return parseFloat((bytes/Math.pow(k,i)).toFixed(2))+' '+sizes[i]; }
}

if (require.main === module) {
    const mgr = new BackupManager();
    const cmd = process.argv[2];
    switch (cmd) {
        case 'create': mgr.createBackup().catch(console.error); break;
        case 'list': mgr.listBackups().then(list=>{ console.log('\n=== 可用备份 ==='); list.forEach((b,i)=>{ console.log(`${i+1}. ${b.name}`); console.log(`   时间: ${new Date(b.timestamp).toLocaleString()}`); console.log(`   文件数: ${b.files}`); console.log(`   大小: ${mgr.formatBytes(b.size)}`); console.log(''); }); }).catch(console.error); break;
        case 'restore': { const name=process.argv[3]; if(!name){ console.log('❌ 请指定要恢复的备份名称'); console.log('用法: node scripts/backup.js restore <backup-name>'); process.exit(1);} mgr.restoreBackup(name).catch(console.error); break; }
        case 'cleanup': { const max=parseInt(process.argv[3])||10; mgr.cleanupOldBackups(max).catch(console.error); break; }
        case 'status': mgr.displayBackupStatus().catch(console.error); break;
        default:
            console.log('TRON 钱包备份管理器');
            console.log('');
            console.log('用法:');
            console.log('  node scripts/backup.js create');
            console.log('  node scripts/backup.js list');
            console.log('  node scripts/backup.js restore <name>');
            console.log('  node scripts/backup.js cleanup [max]');
            console.log('  node scripts/backup.js status');
    }
}

module.exports = BackupManager; 