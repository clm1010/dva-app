import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from 'echarts-for-react'

/* global window */

const LineChart = ({ data }) => {
  const chartRef = useRef(null)
  const [displayData, setDisplayData] = useState({ categories: [], values: [] })
  const progressTimerRef = useRef(null)

  // 使用 useRef 来存储定时器ID
  const resizeTimerRef = useRef(null)

  // 数据验证和默认值
  const safeData = {
    categories: (data && data.categories) || [],
    values: (data && data.values) || []
  }

  // 检查数据是否有效
  const hasValidData =
    safeData.categories.length > 0 && safeData.values.length > 0

  // 实现渐进加载效果
  useEffect(() => {
    if (!hasValidData || safeData.categories.length === 0) {
      setDisplayData({ categories: [], values: [] })
      return undefined
    }

    // 清理之前的定时器
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current)
    }

    // 重置显示数据
    setDisplayData({ categories: [], values: [] })

    // 渐进加载数据点
    let currentIndex = 0
    const totalPoints = safeData.categories.length
    const intervalTime = Math.max(20, 2000 / totalPoints) // 每个点至少10ms，总时长约2秒，确保明显效果

    const addNextPoint = () => {
      if (currentIndex < totalPoints) {
        setDisplayData({
          categories: safeData.categories.slice(0, currentIndex + 1),
          values: safeData.values.slice(0, currentIndex + 1)
        })
        currentIndex++

        progressTimerRef.current = setTimeout(addNextPoint, intervalTime)
      }
    }

    // 延迟800ms后开始渐进加载，确保用户能看到效果
    progressTimerRef.current = setTimeout(addNextPoint, 800)

    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
      }
    }
  }, [data, hasValidData, safeData.categories.length, safeData.values.length])

  const option = {
    // 图表背景色
    backgroundColor: '#EFEFEF',
    // 简化动画配置 - 配合数据渐进加载（兼容ECharts 3.8.5）
    animation: true, // 开启动画
    animationDuration: 300, // 快速动画，配合数据渐进
    animationEasing: 'cubicOut', // 缓动效果（3.8.5兼容）
    animationDelay: 0, // 无延迟
    animationDurationUpdate: 200, // 数据更新动画时长
    animationEasingUpdate: 'cubicOut', // 数据更新动画（3.8.5兼容）
    animationDelayUpdate: 0, // 数据更新动画延迟
    // X轴配置
    xAxis: {
      type: 'category', // 类目轴
      boundaryGap: false, // 坐标轴两边不留白
      data: displayData.categories, // X轴数据
      show: false, // 隐藏X轴
      animation: true, // 开启X轴动画
      animationDuration: 200, // X轴动画时长
      animationEasing: 'cubicOut' // X轴动画缓动（3.8.5兼容）
    },
    // Y轴配置
    yAxis: {
      type: 'value', // 数值轴
      boundaryGap: false, // 坐标轴两边不留白
      show: false, // 隐藏Y轴
      animation: true, // 开启Y轴动画
      animationDuration: 200, // Y轴动画时长
      animationEasing: 'cubicOut' // Y轴动画缓动（3.8.5兼容）
    },
    // 网格配置
    grid: {
      show: false, // 隐藏网格
      borderWidth: 0, // 网格边框宽度
      left: 2, // 左边距
      right: 2, // 右边距
      top: 2, // 上边距
      bottom: 2 // 下边距
    },
    // 系列配置
    series: [
      {
        data: displayData.values, // 系列数据
        showSymbol: false, // 隐藏数据点标记
        type: 'line', // 折线图类型
        animation: true, // 开启系列动画
        animationDuration: 200, // 系列动画时长 - 快速绘制新点
        animationEasing: 'cubicOut', // 缓动效果（3.8.5兼容）
        animationDelay: 0, // 无延迟
        // 线条样式
        lineStyle: {
          color: '#1890ff', // 线条颜色
          width: 2 // 线条宽度
        },
        // 数据项样式
        itemStyle: {
          color: '#1890ff' // 数据点颜色
        },
        // 区域填充样式
        areaStyle: {
          color: {
            type: 'linear', // 线性渐变
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0, // 渐变起始位置
                color: 'rgba(24, 144, 255, 0.6)' // 起始颜色(60%透明度)
              },
              {
                offset: 1, // 渐变结束位置
                color: 'rgba(24, 144, 255, 0.1)' // 结束颜色(10%透明度)
              }
            ]
          }
        },
        smooth: true, // 开启平滑曲线
        symbolSize: 0, // 数据点大小为0(隐藏)
        // 高亮状态配置（简化以兼容3.8.5）
        emphasis: {
          lineStyle: {
            width: 3 // 高亮时线条宽度
          }
        }
      }
    ]
  }

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        const echartsInstance = chartRef.current.getEchartsInstance()
        if (echartsInstance) {
          // 清理之前的定时器
          if (resizeTimerRef.current) {
            clearTimeout(resizeTimerRef.current)
          }

          // 延迟执行resize，确保DOM更新完成
          resizeTimerRef.current = setTimeout(() => {
            // 简化resize调用以兼容3.8.5
            echartsInstance.resize()
            resizeTimerRef.current = null
          }, 100)
        }
      }
    }

    // 确保在浏览器环境下才添加事件监听
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        // 清理定时器
        if (resizeTimerRef.current) {
          clearTimeout(resizeTimerRef.current)
          resizeTimerRef.current = null
        }
      }
    }

    // 如果不在浏览器环境，返回空函数
    return () => {}
  }, [])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current)
        resizeTimerRef.current = null
      }
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current)
        progressTimerRef.current = null
      }
    }
  }, [])

  if (displayData.categories.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EFEFEF',
          color: '#999',
          fontSize: '12px',
          transition: 'all 0.3s ease'
        }}
      >
        暂无数据
      </div>
    )
  }

  return (
    <ReactEcharts
      ref={chartRef}
      option={option}
      style={{
        height: '100%',
        width: '100%',
        transition: 'all 0.3s ease'
      }}
      opts={{
        renderer: 'canvas',
        width: 'auto',
        height: 'auto'
      }}
      notMerge
    />
  )
}

LineChart.propTypes = {
  data: PropTypes.shape({
    categories: PropTypes.array,
    values: PropTypes.array
  })
}

LineChart.defaultProps = {
  data: {
    categories: [],
    values: []
  }
}

export default LineChart
