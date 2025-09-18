# QPS查询模块修改总结

## 修改目标
根据图片中的表格结构，修改QPS查询模块以正确显示基于appcode分组的数据，每个hostip显示为单独的表格行。

## 主要修改内容

### 1. DSL查询配置优化
- **文件**: `antd-admin/src/models/qps.js`
- **修改位置**: `effects.query` 方法中的DSL模板配置部分
- **主要变更**:
  - 使用 `performanceOelCfg.js` 中的 `queryQpsAllPerformance` 模板
  - 动态设置时间范围：`dslTemplate.query.bool.must[0].range.clock.gte/lte`
  - 配置appcode分组：`dslTemplate.aggs.group_by_device.terms.field = 'appcode'`
  - 配置hostip聚合：`dslTemplate.aggs.group_by_device.aggs.hostip_values.terms.field = 'hostip'`
  - 配置设备统计：`dslTemplate.aggs.group_by_device.aggs.device_count.cardinality.field = 'hostip'`

### 2. 数据处理逻辑重构
- **函数**: `processQpsData`
- **核心变更**:
  - 为每个hostip创建单独的表格行
  - 每个appcode分组下的所有hostip都会显示为独立行
  - 保持相同appcode的行具有相同的role值，用于表格行合并显示
  - 为每个hostip生成独立的图表数据

### 3. 表格显示优化
- **文件**: `antd-admin/src/routes/qps/index.js`
- **修改**: 设备IP列宽度从130px调整为160px，确保IP地址完整显示

## 数据流程

1. **查询阶段**:
   ```
   DSL查询 → 按appcode分组 → 每个分组内按hostip聚合 → 获取时间序列数据
   ```

2. **数据处理阶段**:
   ```
   ES聚合结果 → processQpsData函数 → 为每个hostip创建表格行 → 生成图表数据
   ```

3. **表格显示阶段**:
   ```
   表格数据 → 按role(appcode)分组显示 → 行合并相同role → 显示每个hostip的详细信息
   ```

## 关键技术点

### 1. 动态DSL配置
```javascript
// 使用配置文件中的模板
dslTemplate = _.cloneDeep(peformanceCfg.queryQpsAllPerformance)

// 动态设置查询参数
dslTemplate.query.bool.must[0].range.clock.gte = startTime
dslTemplate.query.bool.must[0].range.clock.lte = endTime
dslTemplate.aggs.group_by_device.terms.field = 'appcode'
```

### 2. 多层级数据处理
```javascript
// 处理每个appcode分组
devices.forEach((device, index) => {
  // 获取该appcode的基本信息
  const deviceInfo = safeGetSource(device.latest_info.hits.hits[0])
  
  // 处理该appcode下的每个hostip
  hostipBuckets.forEach((hostipBucket, hostipIndex) => {
    // 为每个hostip创建独立的表格行
    processedData.push({
      key: `device-${index}-${deviceInfo.appcode}-${hostip}-${hostipIndex}`,
      role: determineRole(deviceInfo), // 使用appcode作为角色
      vendor: deviceInfo.vendor || '未知',
      device: deviceInfo.appcode,
      hostip: hostip,
      chartData: chartData // 该hostip的时间序列数据
    })
  })
})
```

### 3. 表格行合并逻辑
表格中的"角色"列会自动合并相同appcode的行，通过计算连续相同role的行数来实现rowSpan设置。

## 预期效果

1. **表格显示**: 每个hostip显示为独立行，相同appcode的行在"角色"列合并显示
2. **数据完整性**: 每个hostip都有独立的时间序列图表数据
3. **性能优化**: 基于配置文件的动态DSL生成，避免硬编码
4. **可维护性**: 代码结构清晰，易于后续维护和扩展

## 配置文件依赖
- `antd-admin/src/utils/performanceOelCfg.js` 中的 `queryQpsAllPerformance` 模板
- 该模板提供了标准的DSL结构，代码中动态填充具体参数 