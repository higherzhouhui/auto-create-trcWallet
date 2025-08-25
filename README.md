# TRON 钱包生成器

这是一个高性能、高健壮性的 TRON 区块链钱包生成器，能够批量生成钱包地址并寻找包含特定后缀的地址。

## 🚀 新功能

### 优化内容
- ✅ **线程池优化**: 避免重复调用，提高效率
- ✅ **延迟控制**: 可配置的生成延迟，避免资源过载
- ✅ **错误处理**: 完善的错误处理和恢复机制
- ✅ **异步文件操作**: 使用 Promise 提高文件操作性能
- ✅ **进度监控**: 实时显示生成进度和统计信息
- ✅ **日志记录**: 详细的日志记录和文件保存
- ✅ **批量处理**: 智能批处理提高性能
- ✅ **系统监控**: 实时监控系统资源使用情况

### 🛡️ 健壮性增强
- ✅ **状态持久化**: 自动保存和恢复程序状态
- ✅ **内存管理**: 智能内存监控和垃圾回收
- ✅ **错误恢复**: 自动错误恢复和重试机制
- ✅ **文件管理**: 自动文件轮转和大小控制
- ✅ **备份系统**: 自动备份和恢复功能
- ✅ **健康检查**: 定期系统健康检查
- ✅ **性能监控**: 详细的性能指标记录
- ✅ **告警系统**: 系统资源告警机制

## 📦 安装

```bash
npm install
```

## 🎯 使用方法

### 启动钱包生成
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 启动系统监控
```bash
npm run monitor
```

### 数据备份管理
```bash
# 创建备份
npm run backup create

# 列出所有备份
npm run backup list

# 恢复指定备份
npm run backup restore <backup-name>

# 清理旧备份
npm run backup cleanup [max-backups]

# 查看备份状态
npm run backup status
```

### 停止程序
使用 `Ctrl+C` 优雅停止程序

## ⚙️ 配置

编辑 `config.js` 文件来自定义配置：

```javascript
module.exports = {
    // 线程池配置
    WORKER_POOL: {
        MAX_WORKERS: 4,        // 最大工作线程数
        WORKER_TIMEOUT: 30000, // 工作线程超时时间
        RESTART_ON_FAILURE: true, // 失败时自动重启
        MAX_RESTART_ATTEMPTS: 3   // 最大重启尝试次数
    },
    
    // 钱包生成配置
    WALLET_GENERATION: {
        TARGET_SUFFIXES: [     // 目标地址后缀
            'wind', '9527', '6666', '8888', '9999', 
            '66666', '88888', '99999', '666666', '888888', 
            'money', 'flysky', '666', '888'
        ],
        GENERATION_DELAY: 10,  // 生成延迟（毫秒）
        BATCH_SIZE: 1000,      // 批量处理大小
        MAX_WALLETS: 20000000, // 最大生成钱包数量
        LOG_INTERVAL: 10000,   // 日志记录间隔
        MAX_RETRY_ATTEMPTS: 3, // 最大重试次数
        RETRY_DELAY: 1000      // 重试延迟（毫秒）
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
```

## 📊 监控功能

### 系统监控
- 内存使用情况
- CPU 负载
- 平台信息
- Node.js 版本
- 系统健康评分
- 告警系统

### 钱包生成统计
- 总生成数量
- 匹配数量
- 生成速度
- 运行时间
- 匹配率
- 错误统计

### 性能监控
- 内存使用趋势
- CPU 使用趋势
- 批处理性能
- 队列状态
- 响应时间

## 📁 文件说明

- `index.js` - 主程序入口，管理线程池
- `child.js` - 钱包生成核心逻辑（健壮性增强）
- `config.js` - 配置文件
- `monitor.js` - 系统监控脚本（增强版）
- `backup.js` - 数据备份和恢复工具
- `private.json` - 匹配的钱包信息输出
- `app.log` - 程序运行日志
- `error.log` - 错误日志
- `wallet_state.json` - 程序状态文件
- `wallet_checkpoint.json` - 检查点文件
- `system_alerts.log` - 系统告警日志
- `performance_metrics.log` - 性能指标日志

## 🔧 性能优化

1. **批量处理**: 使用队列和批处理减少 I/O 操作
2. **异步操作**: 所有文件操作都是异步的
3. **内存管理**: 智能内存使用和垃圾回收
4. **错误恢复**: 自动错误恢复和继续运行
5. **状态持久化**: 自动保存和恢复程序状态
6. **智能重试**: 失败操作的自动重试机制

## 🛡️ 健壮性特性

### 错误处理
- 完善的异常捕获和处理
- 自动重试机制
- 错误日志记录
- 错误统计和报告

### 内存管理
- 实时内存使用监控
- 自动垃圾回收
- 内存泄漏检测
- 队列大小限制

### 文件管理
- 自动文件轮转
- 文件大小控制
- 自动备份
- 损坏文件检测

### 状态恢复
- 检查点保存
- 状态持久化
- 自动恢复
- 数据完整性检查

## ⚠️ 注意事项

1. 确保有足够的磁盘空间存储日志和输出文件
2. 监控系统资源使用情况
3. 根据需要调整生成延迟和批量大小
4. 定期检查日志文件大小
5. 定期创建数据备份
6. 监控系统告警信息

## 🆘 故障排除

### 常见问题
1. **内存不足**: 减少 `BATCH_SIZE` 或增加 `GENERATION_DELAY`
2. **磁盘空间不足**: 定期清理日志文件和旧备份
3. **性能问题**: 调整线程池大小和生成延迟
4. **程序崩溃**: 检查错误日志，使用备份恢复

### 日志查看
```bash
# 查看实时日志
tail -f app.log

# 查看错误日志
tail -f error.log

# 查看系统告警
tail -f system_alerts.log

# 查看性能指标
tail -f performance_metrics.log
```

### 数据恢复
```bash
# 查看可用备份
npm run backup list

# 恢复最新备份
npm run backup restore <backup-name>

# 创建新备份
npm run backup create
```

## 📈 性能基准

- **生成速度**: 约 100-1000 钱包/秒（取决于配置）
- **内存使用**: 约 100-500MB（取决于批量大小）
- **CPU 使用**: 中等（可配置）
- **磁盘 I/O**: 低（批量处理优化）
- **恢复时间**: < 1秒（状态持久化）

## 🔒 安全特性

- 敏感数据隐藏（可选）
- 私钥加密（可选）
- 访问控制
- 操作审计
- 数据完整性检查

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## �� 许可证

ISC License 