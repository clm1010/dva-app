# ECharts getWidth错误修复总结

## 问题描述
在QPS页面中出现ECharts错误：
```
Uncaught TypeError: Cannot read properties of null (reading 'getWidth')
at ZRender.getWidth (roadhog.dll.js:67403:25)
at echartsProto.getWidth (roadhog.dll.js:7001:19)
at ExtensionAPI.getWidth (roadhog.dll.js:510:17)
at ExtendedClass._updatePosition (roadhog.dll.js:374631:31)
at ExtendedClass._showTooltipContent (roadhog.dll.js:374617:10)
```

## 问题原因分析
这个错误通常发生在以下情况：
1. **DOM元素被销毁**：组件卸载时，ECharts实例还在尝试访问已被销毁的DOM容器
2. **异步操作时序问题**：在异步操作（如setTimeout）中访问DOM时，元素可能已经被移除
3. **容器尺寸问题**：DOM容器的宽度为0或不存在时，ECharts无法正确计算尺寸
4. **实例状态不一致**：ECharts实例状态与DOM状态不同步

## 修复方案

### 1. 添加DOM容器安全检查

**修改前**：
```javascript
const echartsInstance = chartRef.current.getEchartsInstance()
if (echartsInstance && typeof echartsInstance.resize === 'function') {
  echartsInstance.resize({
    animation: {
      duration: 400,
      easing: 'cubicOut'
    }
  })
}
```

**修改后**：
```javascript
const echartsInstance = chartRef.current.getEchartsInstance()
if (echartsInstance && typeof echartsInstance.resize === 'function') {
  // 检查DOM容器是否存在
  const container = echartsInstance.getDom()
  if (container && container.offsetWidth > 0) {
    echartsInstance.resize({
      animation: {
        duration: 400,
        easing: 'cubicOut'
      }
    })
  }
}
```

### 2. 添加组件挂载状态检查

**添加状态管理**：
```javascript
const [isComponentMounted, setIsComponentMounted] = useState(true)
```

**在所有ECharts操作前检查组件状态**：
```javascript
if (isComponentMounted && chartRef.current) {
  const echartsInstance = chartRef.current.getEchartsInstance()
  // ... 执行ECharts操作
}
```

### 3. 创建安全的ECharts操作工具函数

```javascript
// 安全的ECharts操作工具函数
const safeEchartsOperation = (operation) => {
  try {
    if (isComponentMounted && chartRef.current) {
      const echartsInstance = chartRef.current.getEchartsInstance()
      if (echartsInstance) {
        const container = echartsInstance.getDom()
        if (container && container.offsetWidth > 0) {
          return operation(echartsInstance)
        }
      }
    }
  } catch (error) {
    console.warn('ECharts操作错误:', error)
  }
  return null
}
```

### 4. 添加组件卸载时的清理逻辑

```javascript
// 组件卸载时的清理
useEffect(() => {
  return () => {
    setIsComponentMounted(false)
    // 清理ECharts实例
    if (chartRef.current) {
      try {
        const echartsInstance = chartRef.current.getEchartsInstance()
        if (echartsInstance && typeof echartsInstance.dispose === 'function') {
          echartsInstance.dispose()
        }
      } catch (error) {
        console.warn('清理ECharts实例错误:', error)
      }
    }
  }
}, [])
```

### 5. 增强异步操作的安全性

**修改前**：
```javascript
setTimeout(() => {
  echartsInstance.resize({
    animation: {
      duration: 400,
      easing: 'cubicOut'
    }
  })
}, 100)
```

**修改后**：
```javascript
setTimeout(() => {
  try {
    if (isComponentMounted) {
      echartsInstance.resize({
        animation: {
          duration: 400,
          easing: 'cubicOut'
        }
      })
    }
  } catch (resizeError) {
    console.warn('图表resize执行错误:', resizeError)
  }
}, 100)
```

### 6. 修复事件处理器

**鼠标事件处理**：
```javascript
mouseover: (params) => {
  try {
    if (isComponentMounted && chartRef.current) {
      const echartsInstance = chartRef.current.getEchartsInstance()
      if (echartsInstance && typeof echartsInstance.dispatchAction === 'function') {
        const container = echartsInstance.getDom()
        if (container && container.offsetWidth > 0) {
          echartsInstance.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            dataIndex: params.dataIndex
          })
        }
      }
    }
  } catch (error) {
    console.warn('鼠标悬停事件错误:', error)
  }
}
```

## 修复效果

### 修复前
- 频繁出现`Cannot read properties of null (reading 'getWidth')`错误
- 页面切换时可能导致JavaScript错误
- 组件卸载时没有正确清理ECharts实例

### 修复后
- 所有ECharts操作都有安全检查
- 组件卸载时正确清理资源
- 异步操作有完善的错误处理
- 不再出现DOM访问相关的错误

## 技术要点

1. **防御性编程**：在每次DOM操作前都进行安全检查
2. **生命周期管理**：正确管理组件的挂载和卸载状态
3. **资源清理**：组件销毁时主动清理ECharts实例
4. **错误边界**：使用try-catch包装所有ECharts操作
5. **状态同步**：确保组件状态与DOM状态保持一致

## 相关文件
- `antd-admin/src/routes/qps/LineChart1.js` - 主要修复的组件
- `antd-admin/src/routes/qps/LineChart.js` - 可能需要类似修复的组件

## 预防措施
1. 在所有ECharts相关组件中应用相同的安全检查模式
2. 定期检查控制台是否有新的ECharts相关错误
3. 在组件开发时就考虑生命周期管理
4. 使用统一的ECharts操作工具函数

这个修复确保了ECharts在各种异常情况下都能稳定运行，显著提升了应用的稳定性和用户体验。 