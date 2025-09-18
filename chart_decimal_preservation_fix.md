# 图表数值小数点保留修复说明

## 问题描述
在QPS和性能图表中，数值显示时会去掉小数点后面的值，只显示整数部分或截断到固定位数，这导致数据精度丢失。

## 修复内容

### 1. Y轴标签格式化修复
修改了以下文件中的Y轴标签格式化函数：

**PerChart.js**
```javascript
// 修复前：
formatter: (value) => {
  return value % 1 === 0 ? value.toString() : value.toFixed(2)
}

// 修复后：
formatter: (value) => {
  // 保留完整的小数值，不进行截断
  return String(value)
}
```

**LineChart1.js**
```javascript
// 修复前：
formatter: (value) => {
  return value % 1 === 0 ? value.toString() : value.toFixed(2)
}

// 修复后：
formatter: (value) => {
  // 保留完整的小数值，不进行截断
  return String(value)
}
```

**LineChartSum.js**
```javascript
// 修复前：
formatter: (value) => {
  return value % 1 === 0 ? value.toString() : value.toFixed(2)
}

// 修复后：
formatter: (value) => {
  // 保留完整的小数值，不进行截断
  return String(value)
}
```

### 2. 数据处理函数修复

**qps.js 模型**
```javascript
// 修复前：
const safeGetValue = (value) => {
  if (value == null) return 0
  const numValue = Number(value)
  return Number.isNaN(numValue) ? 0 : Math.round(numValue)  // 会去掉小数
}

// 修复后：
const safeGetValue = (value) => {
  if (value == null) return 0
  const numValue = Number(value)
  // 保留完整的小数值，不进行Math.round截断
  return Number.isNaN(numValue) ? 0 : numValue
}
```

**chddetail.js 模型**
```javascript
// 修复前：
const safeGetValue = (value) => {
  if (_.isNil(value)) return 0
  const numValue = Number(value)
  return _.isNaN(numValue) ? 0 : Math.round(numValue)  // 会去掉小数
}

// 修复后：
const safeGetValue = (value) => {
  if (_.isNil(value)) return 0
  const numValue = Number(value)
  // 保留完整的小数值，不进行Math.round截断
  return _.isNaN(numValue) ? 0 : numValue
}
```

**performHost.js 模型**
```javascript
// 修复前：
const seriesData = _.compact(hits.map(hit => {
  const value = _.get(hit, '_source.value')
  return _.isNumber(value) ? value : safeParseInt(value, 0)  // 会截断为整数
}))

// 修复后：
const seriesData = _.compact(hits.map(hit => {
  const value = _.get(hit, '_source.value')
  // 保留完整的小数值，不进行整数截断
  if (_.isNumber(value)) return value
  const numValue = Number(value)
  return _.isNaN(numValue) ? 0 : numValue
}))
```

## 修复效果
- Y轴标签现在显示完整的数值，不会截断到2位小数
- 数据处理过程中保留原始的小数精度
- 图表显示的数值更加准确，反映真实的数据精度

## 未修改的内容
- 分页计算相关的Math.ceil、Math.floor保持不变
- 时间戳计算相关的Math.floor保持不变
- 其他功能逻辑完全不变

## 测试建议
1. 查看图表Y轴标签是否显示完整的小数值
2. 验证tooltip中显示的数值是否保留小数
3. 确认数据处理过程中没有丢失精度
4. 测试各种小数位数的数据显示是否正常 