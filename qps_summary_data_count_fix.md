# QPS汇总数据点数统计修复说明

## 问题描述
在QPS图表中，当显示汇总数据时（hostip为"汇总数据"），底部显示的数据点数量不准确。例如图中显示"数据点: 2295"，这个数字是所有设备数据点的累积总和，而不是汇总后的唯一时间点数量。

## 问题原因
在 `LineChart1.js` 组件中，`actualLoadedCount` 的计算逻辑存在问题：

```javascript
const actualLoadedCount = useMemo(() => {
  if (!pagination || pagination.current === 0) {
    return accumulatedData.values.length  // 直接返回累积数据长度
  }
  // ...
})
```

汇总数据应该是将多个设备在同一时间点的数据合并，所以数据点数应该等于唯一时间点的数量，而不是所有数据值的累积总和。

## 修复方案
修改了 `actualLoadedCount` 的计算逻辑，增加了对汇总数据的特殊处理：

```javascript
const actualLoadedCount = useMemo(() => {
  if (!pagination || pagination.current === 0) {
    // 如果是汇总数据（hostip为空或为"汇总数据"），计算唯一时间点的数量
    if (!hostip || hostip === '汇总数据') {
      // 使用Set来获取唯一时间点的数量
      const uniqueTimePoints = new Set(accumulatedData.categories)
      return uniqueTimePoints.size
    }
    // 非汇总数据，返回实际数据长度
    return accumulatedData.values.length
  }
  // ... 其他逻辑保持不变
}, [accumulatedData.values.length, accumulatedData.categories, pagination, hostip])
```

## 修改影响
1. 汇总数据的数据点数显示将更加准确，显示的是唯一时间点的数量
2. 非汇总数据（单个设备IP）的显示逻辑不受影响
3. 不影响其他功能，包括"所有设备IP的QPS汇总曲线图 - 每个IP独立显示"功能

## 测试建议
1. 查看汇总数据图表，验证底部显示的数据点数是否为唯一时间点的数量
2. 查看单个设备IP的图表，确认数据点数显示正常
3. 对比多个设备的数据，确认汇总后的时间点数量正确 