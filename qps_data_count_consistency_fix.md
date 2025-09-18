# QPS图表数据点数一致性修复说明

## 问题描述
在QPS详情页面中，两个图表显示的数据点数不一致：
- "所有设备IP的QPS曲线图"：每个设备显示各自的"已加载XX条"
- "所有设备IP的QPS汇总曲线图 - 每个IP独立显示"：显示的"数据点"是合并后的唯一时间点数

这导致了混淆，例如：
- 如果有3个设备，每个设备有100个数据点
- 单个设备显示"已加载100条"
- 汇总图表原本只显示"数据点: 100"（如果时间点相同）或更多（如果时间点不完全重合）

## 问题原因
`LineChartSum`组件原本只计算并显示唯一时间点的数量（`summaryData.timeCategories.length`），这是通过`Set`去重后的结果。而每个设备的`LineChart1`组件显示的是该设备实际的数据点数。

## 修复方案
修改了`LineChartSum`组件，增加了数据点总数的统计：

1. 在`summaryData`计算中增加`totalDataPoints`变量
2. 累加每个设备的数据点数：`totalDataPoints += deviceData.categories.length`
3. 在界面上同时显示两个统计信息：
   - **数据点总数**：所有设备的数据点累积总和
   - **唯一时间点**：合并后去重的时间点数量

## 修改后的效果
```javascript
// 修改前：只显示唯一时间点数
<strong>数据点:</strong> {summaryData.timeCategories.length}

// 修改后：同时显示两个统计信息
<strong>数据点总数:</strong> {summaryData.totalDataPoints}
<strong>唯一时间点:</strong> {summaryData.timeCategories.length}
```

## 影响范围
- 仅修改了`LineChartSum`组件的数据统计和显示逻辑
- 不影响图表的渲染和功能
- 不影响其他组件

## 使用示例
现在汇总图表会显示类似这样的信息：
- 设备数量: 3
- 数据点总数: 300（每个设备100个点）
- 唯一时间点: 100（如果所有设备的时间点相同）

这样用户可以清楚地理解：
- 总共有多少个数据点被加载
- 这些数据点合并后有多少个唯一的时间点
- 与单个设备显示的"已加载XX条"保持逻辑一致 