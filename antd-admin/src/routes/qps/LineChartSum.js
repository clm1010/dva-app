import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from 'echarts-for-react'
import moment from 'moment'

moment.locale('zh-cn')

const CHART_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
]

const safeParseFloat = (value) => {
  if (value == null || value === '') return 0
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value
  }
  const numValue = parseFloat(value)
  return Number.isNaN(numValue) ? 0 : numValue
}

const safeFormatTime = (timeStr) => {
  try {
    const timestamp = parseInt(timeStr, 10)
    if (!Number.isNaN(timestamp) && timestamp > 0) {
      return moment(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
    }

    if (
      typeof timeStr === 'string' &&
      timeStr.includes(':') &&
      !timeStr.includes('-')
    ) {
      const today = moment().format('YYYY-MM-DD')
      return `${today} ${timeStr}`
    }

    if (
      typeof timeStr === 'string' &&
      timeStr.includes('-') &&
      timeStr.includes(':')
    ) {
      return timeStr
    }

    return String(timeStr || '')
  } catch (error) {
    console.warn('时间格式转换错误:', error, timeStr)
    return String(timeStr || '')
  }
}

const LineChartSum = ({ deviceList = [], hostipDetails = {} }) => {
  const chartRef = useRef(null)

  const summaryData = useMemo(() => {
    try {
      if (!Array.isArray(deviceList) || deviceList.length === 0) {
        return { seriesData: [], timeCategories: [], totalDataPoints: 0 }
      }

      const allTimePoints = new Set()
      const deviceDataMap = new Map()
      let totalDataPoints = 0

      for (const device of deviceList) {
        if (!device || !device.hostip) continue

        const deviceData = hostipDetails[device.hostip]
        if (!deviceData || !deviceData.categories || !deviceData.values) {
          continue
        }

        if (
          !Array.isArray(deviceData.categories) ||
          !Array.isArray(deviceData.values)
        ) {
          continue
        }

        // 累加每个设备的数据点数
        totalDataPoints += deviceData.categories.length

        const deviceTimeMap = new Map()
        deviceData.categories.forEach((timeStr, index) => {
          const value = safeParseFloat(deviceData.values[index])
          const formattedTime = safeFormatTime(timeStr)
          deviceTimeMap.set(formattedTime, value)
          allTimePoints.add(formattedTime)
        })

        deviceDataMap.set(device.hostip, deviceTimeMap)
      }

      const sortedTimePoints = Array.from(allTimePoints).sort((a, b) => {
        try {
          const timeA = new Date(a).getTime()
          const timeB = new Date(b).getTime()
          if (!Number.isNaN(timeA) && !Number.isNaN(timeB)) {
            return timeA - timeB
          }
          return a.localeCompare(b)
        } catch (error) {
          console.warn('时间排序错误:', error, { a, b })
          return 0
        }
      })

      const seriesData = []
      let colorIndex = 0

      for (const [hostip, timeMap] of deviceDataMap.entries()) {
        const data = sortedTimePoints.map((time) => ({
          value: timeMap.get(time) || 0,
          hostip,
          time
        }))

        seriesData.push({
          name: hostip,
          data,
          color: CHART_COLORS[colorIndex % CHART_COLORS.length]
        })
        colorIndex++
      }

      return { seriesData, timeCategories: sortedTimePoints, totalDataPoints }
    } catch (error) {
      console.error('汇总数据计算错误:', error)
      return { seriesData: [], timeCategories: [], totalDataPoints: 0 }
    }
  }, [deviceList, hostipDetails])

  const hasValidData =
    summaryData.seriesData.length > 0 && summaryData.timeCategories.length > 0

  const generateFileName = useCallback(() => {
    try {
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
      return `QPS汇总图表_${summaryData.seriesData.length}设备_${timestamp}`
    } catch (error) {
      console.warn('生成文件名失败:', error)
      return `QPS汇总图表_${Date.now()}`
    }
  }, [summaryData.seriesData.length])

  const option = useMemo(() => {
    if (!hasValidData) {
      return {
        backgroundColor: '#fff',
        title: { text: '暂无数据', left: 'center', top: 'center' },
        series: []
      }
    }

    const series = summaryData.seriesData.map((deviceSeries, index) => ({
      name: deviceSeries.name,
      type: 'line',
      data: deviceSeries.data.map((item) => ({
        value: item.value,
        hostip: item.hostip,
        time: item.time
      })),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: deviceSeries.color, width: 2 },
      itemStyle: { color: deviceSeries.color },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: `${deviceSeries.color}30`
            },
            {
              offset: 1,
              color: `${deviceSeries.color}08`
            }
          ]
        }
      },
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      animationDelay: index * 100
    }))

    return {
      backgroundColor: '#fff',
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      title: { show: false },
      toolbox: {
        show: true,
        orient: 'horizontal',
        right: '15px',
        top: '15px',
        itemSize: 18,
        itemGap: 15,
        showTitle: true,
        feature: {
          saveAsImage: {
            show: true,
            type: 'png',
            name: generateFileName(),
            title: '下载图片',
            backgroundColor: '#fff',
            pixelRatio: 2,
            excludeComponents: ['toolbox']
          },
          dataZoom: {
            show: true,
            title: { zoom: '区域缩放', back: '重置缩放' }
          },
          restore: { show: true, title: '还原' }
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: { backgroundColor: '#6a7985' }
        },
        formatter(params) {
          if (params && params.length > 0) {
            let tooltip = `时间: ${params[0].name}<br/>`
            params.forEach((param) => {
              if (param.data && param.data.hostip) {
                tooltip += `${param.marker}${param.data.hostip}: ${param.value}<br/>`
              }
            })
            return tooltip
          }
          return ''
        }
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        left: 'center',
        top: '5%',
        data: summaryData.seriesData.map((item) => ({
          name: item.name,
          textStyle: { color: item.color }
        })),
        itemGap: 20,
        itemWidth: 25,
        itemHeight: 14
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          show: true,
          start: 0,
          end: 100,
          height: 26,
          bottom: 10
        }
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: summaryData.timeCategories,
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45,
          interval: 'auto'
        },
        axisLine: { lineStyle: { color: '#ddd' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#666',
          fontSize: 12,
          formatter: (value) => {
            // 保留完整的小数值，不进行截断
            return String(value)
          }
        },
        axisLine: { lineStyle: { color: '#ddd' } },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      series
    }
  }, [summaryData, generateFileName, hasValidData])

  useEffect(() => {
    return () => {
      // 立即清理
      if (chartRef.current) {
        try {
          const echartsInstance = chartRef.current.getEchartsInstance()
          if (echartsInstance && !echartsInstance.isDisposed()) {
            // 清理所有事件监听器
            echartsInstance.off()
            echartsInstance.dispose()
          }
        } catch (error) {
          console.warn('清理ECharts实例错误:', error)
        }
        chartRef.current = null
      }
    }
  }, [])

  if (!hasValidData) {
    return (
      <div
        style={{
          height: '460px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#999',
          fontSize: '14px'
        }}
      >
        暂无汇总数据
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <ReactEcharts
        ref={chartRef}
        option={option}
        style={{ height: '460px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={false}
        showLoading={false}
      />

      <div style={{ marginTop: '15px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666'
          }}
        >
          <div>
            <span style={{ marginRight: '20px' }}>
              <strong>设备数量:</strong> {summaryData.seriesData.length}
            </span>
            <span style={{ marginRight: '20px' }}>
              <strong>数据点总数:</strong> {summaryData.totalDataPoints}
            </span>
            {/* <span style={{ marginRight: '20px' }}>
              <strong>唯一时间点:</strong> {summaryData.timeCategories.length}
            </span> */}
          </div>
        </div>
      </div>
    </div>
  )
}

LineChartSum.propTypes = {
  deviceList: PropTypes.array,
  hostipDetails: PropTypes.object
}

export default LineChartSum
