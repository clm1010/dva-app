# Elasticsearch数据导入脚本使用说明

## 功能描述
此脚本用于将222.json文件中的数据导入到本地Elasticsearch中，具备数据清洗、正则表达式验证和批量导入功能。

## 环境要求
- Python 3.6+
- Elasticsearch 7.x 或 8.x
- 必要的Python包（见requirements.txt）

## 安装依赖
```bash
pip install -r requirements.txt
```

## 正则表达式处理功能
脚本包含以下正则表达式处理：

### 1. IP地址验证
- 模式：`^(\d{1,3}\.){3}\d{1,3}$`
- 用于：`hostip`、`keyword`字段
- 作用：确保IP地址格式正确

### 2. 主机名清理
- 模式：`[^\w\-\.]` → 替换为 `_`
- 用于：`hostname`、`moname`字段
- 作用：移除主机名中的特殊字符

### 3. 时间戳验证
- 模式：`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`
- 用于：`@timestamp`字段
- 作用：验证ISO时间格式

### 4. 数值字段处理
- 模式：`^-?\d+(\.\d+)?$`
- 用于：`process_val`、`value`、`ns`、`clock`等
- 作用：确保数值字段格式正确

### 5. 文本字段清理
- 模式：`[<>"\']` → 移除
- 模式：`[\x00-\x1f\x7f-\x9f]` → 移除控制字符
- 用于：`agent`、`mngtorg`、`appname`等
- 作用：移除潜在的危险字符和控制字符

### 6. 中文字符检测
- 模式：`[\u4e00-\u9fff]+`
- 作用：检测和处理中文字符

## 使用方法

### 基本用法
```bash
python import_to_es.py
```

### 完整参数用法
```bash
python import_to_es.py \
  --file 222.json \
  --host localhost \
  --port 9200 \
  --user elastic \
  --password your_password \
  --batch-size 1000
```

### 参数说明
- `--file, -f`: JSON文件路径（默认：222.json）
- `--host`: ES主机地址（默认：localhost）
- `--port`: ES端口（默认：9200）
- `--user`: ES用户名（可选）
- `--password`: ES密码（可选）
- `--batch-size`: 批量导入大小（默认：1000）

## 数据处理流程

1. **连接验证**：测试ES连接是否正常
2. **数据读取**：读取JSON文件并验证格式
3. **数据清洗**：使用正则表达式清洗和验证数据
4. **索引创建**：自动创建所需的ES索引
5. **批量导入**：使用bulk API批量导入数据
6. **结果报告**：显示导入成功和失败的记录数

## 索引映射配置
脚本会自动创建以下字段映射：
- `hostip`: IP类型
- `hostname`: 关键字类型
- `process_val`, `value`: 双精度浮点数
- `ns`, `clock`, `ts`: 长整型
- `@timestamp`, `import_timestamp`: 日期类型
- `agent`, `mngtorg`, `appname`: 文本类型（支持全文搜索和关键字搜索）
- `type`, `componetype`, `vendor`: 关键字类型

## 日志记录
- 日志文件：`es_import.log`
- 日志级别：INFO
- 同时输出到控制台和文件

## 错误处理
- 自动重试机制
- 详细的错误日志记录
- 数据验证失败时跳过并记录
- 批量导入失败时的错误统计

## 性能优化
- 批量导入（默认1000条/批）
- 索引设置优化（单分片、无副本）
- 连接池和重试机制
- 内存友好的数据处理

## 注意事项
1. 确保Elasticsearch服务正在运行
2. 确保有足够的磁盘空间
3. 大文件导入时请耐心等待
4. 如有认证，请提供正确的用户名和密码
5. 建议在测试环境先验证脚本功能

## 故障排除
- 连接失败：检查ES服务状态和网络连接
- 导入失败：查看日志文件了解具体错误
- 内存不足：减少batch_size参数
- 权限问题：确保用户有索引创建和写入权限 