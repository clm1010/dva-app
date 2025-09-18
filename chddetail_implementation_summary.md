# 角色详情功能实现总结

## 功能概述
实现了从QPS列表页面点击角色跳转到角色详情页面的功能，详情页面展示该角色下所有设备IP的QPS曲线图。

## 实现的文件

### 1. DSL查询配置 - `performanceOelCfg.js`
- **新增**: `queryRoleDetailPerformance` DSL模板
- **功能**: 根据appcode查询该角色下所有设备IP的QPS数据
- **查询结构**:
  ```javascript
  {
    query: {
      bool: {
        must: [
          { range: { clock: { gte: 0, lte: 0 } } },  // 时间范围
          { term: { appcode: '' } }                   // 角色过滤
        ]
      }
    },
    aggs: {
      group_by_hostip: {                              // 按IP分组
        terms: { field: 'hostip' },
        aggs: {
          latest_info: { ... },                       // 最新信息
          time_series: { ... }                        // 时间序列数据
        }
      }
    }
  }
  ```

### 2. 服务层 - `services/chddetail.js`
- **功能**: 提供ES查询服务
- **接口**: `queryRoleDetailService(params)`
- **参数**: 
  - `params.es`: DSL查询语句
  - `params.paths`: ES查询路径

### 3. 数据模型 - `models/chddetail.js`
- **命名空间**: `chddetail`
- **状态管理**:
  ```javascript
  state: {
    list: [],        // 角色下所有设备IP的数据
    loading: false,  // 加载状态
    roleInfo: {}     // 角色基本信息
  }
  ```
- **核心功能**:
  - 路由监听：自动获取传递的角色参数
  - 数据查询：调用ES服务获取角色详情数据
  - 数据处理：`processRoleDetailData`函数处理聚合结果

### 4. 页面组件 - `routes/qps/chddetail/index.js`
- **功能**: 角色详情页面展示
- **主要特性**:
  - 展示角色基本信息
  - 使用`LineChart1`组件展示每个设备IP的QPS曲线图
  - 列表形式展示所有设备IP的图表
  - 加载状态管理

## 数据流程

### 1. 页面跳转
```
QPS列表页面 → 点击角色 → 传递角色数据 → 角色详情页面
```

### 2. 数据查询流程
```
路由监听 → 获取角色参数 → 构建DSL查询 → 调用ES服务 → 处理返回数据 → 更新页面状态
```

### 3. 数据处理流程
```
ES聚合结果 → 按hostip分组 → 提取时间序列数据 → 生成图表数据 → 渲染图表
```

## 关键技术实现

### 1. 动态DSL构建
```javascript
// 设置时间范围和角色过滤
dslTemplate.query.bool.must[0].range.clock.gte = startTime
dslTemplate.query.bool.must[0].range.clock.lte = endTime
dslTemplate.query.bool.must[1].term.appcode = appcode
```

### 2. 数据处理优化
```javascript
// 为每个hostip提取完整的时间序列数据
timeSeriesData.forEach((hit) => {
  const source = safeGetSource(hit)
  const { clock, value } = source
  
  // 转换时间格式并收集数据点
  chartData.categories.push(timeLabel)
  chartData.values.push(safeGetValue(value))
})
```

### 3. 图表展示
```javascript
// 使用LineChart1组件展示每个IP的QPS曲线
<List
  dataSource={list}
  renderItem={(item) => (
    <Card title={`设备IP: ${item.hostip}`}>
      <LineChart1 data={item.chartData} />
    </Card>
  )}
/>
```

## 页面效果

1. **角色信息展示**: 显示角色名称、厂商、设备名称、设备IP数量
2. **图表列表**: 每个设备IP显示为独立的卡片，包含完整的QPS曲线图
3. **数据完整性**: 每个IP的图表展示该IP的全部value数据
4. **加载状态**: 查询过程中显示加载动画
5. **错误处理**: 完善的错误处理和用户提示

## 配置依赖

- **DSL模板**: `performanceOelCfg.queryRoleDetailPerformance`
- **图表组件**: `LineChart1.js`
- **ES索引**: `/u2performance_for_test/_search/`
- **数据字段**: `appcode`, `hostip`, `clock`, `value`

## 使用方式

1. 在QPS列表页面点击任意角色链接
2. 系统自动跳转到角色详情页面
3. 页面自动查询该角色下所有设备IP的QPS数据
4. 以图表形式展示每个设备IP的完整QPS曲线

该实现完全基于配置文件，具有良好的可维护性和扩展性。 