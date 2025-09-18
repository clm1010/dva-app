import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from 'echarts-for-react'
import moment from 'moment'
import { Button, message } from 'antd'

moment.locale('zh-cn')

const validateData = (data) => {
  if (!data || typeof data !== 'object') {
    return { categories: [], values: [] }
  }

  const categories = Array.isArray(data.categories) ? data.categories : []
  const values = Array.isArray(data.values) ? data.values : []

  return { categories, values }
}

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

const LineChart1 = ({
  data,
  dispatch,
  pagination,
  hostip,
  appcode,
  startTime,
  endTime,
  hostipMapping = []
}) => {
  const chartRef = useRef(null)
  const [accumulatedData, setAccumulatedData] = useState({
    categories: [],
    values: []
  })
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false)
  const [hasReachedEnd, setHasReachedEnd] = useState(false)
  const [isComponentMounted, setIsComponentMounted] = useState(true)

  const safeData = useMemo(() => validateData(data), [data])

  // 累积数据处理
  useEffect(() => {
    if (!isComponentMounted) return

    if (safeData.categories.length > 0 && safeData.values.length > 0) {
      if (pagination && pagination.current === 1) {
        setAccumulatedData({
          categories: [...safeData.categories],
          values: [...safeData.values]
        })
        setHasReachedEnd(false)
      } else if (pagination && pagination.current > 1) {
        setAccumulatedData((prev) => ({
          categories: [...(prev.categories || []), ...safeData.categories],
          values: [...(prev.values || []), ...safeData.values]
        }))
      } else {
        setAccumulatedData({
          categories: [...safeData.categories],
          values: [...safeData.values]
        })
      }
      if (isComponentMounted) {
        setIsLoadingNextPage(false)
      }
    } else if (
      pagination &&
      pagination.current > 0 &&
      safeData.categories.length === 0
    ) {
      if (isComponentMounted) {
        setHasReachedEnd(true)
        setIsLoadingNextPage(false)
      }
    }
  }, [safeData.categories, safeData.values, pagination, isComponentMounted])

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

    if (pagination.current > 0 && pagination.total > 0) {
      const expectedCount = Math.min(
        pagination.current * pagination.pageSize,
        pagination.total
      )
      return Math.min(accumulatedData.values.length, expectedCount)
    }

    return accumulatedData.values.length
  }, [accumulatedData.values.length, accumulatedData.categories, pagination, hostip])

  const isGettingTotal = Boolean(
    pagination && pagination.current === 0 && pagination.total === 0
  )
  const isInitialData = Boolean(
    pagination && pagination.current === 0 && pagination.total > 0
  )

  const processedData = useMemo(() => {
    try {
      const categories = (accumulatedData.categories || []).map(safeFormatTime)
      const values = (accumulatedData.values || []).map(safeParseFloat)
      const minLength = Math.min(categories.length, values.length)

      return {
        categories: categories.slice(0, minLength),
        values: values.slice(0, minLength)
      }
    } catch (error) {
      console.error('数据处理错误:', error)
      return { categories: [], values: [] }
    }
  }, [accumulatedData])

  const hasValidData = useMemo(() => {
    return (
      processedData.categories.length > 0 &&
      processedData.values.length > 0 &&
      processedData.categories.length === processedData.values.length
    )
  }, [processedData])

  const loadNextPage = useCallback(() => {
    if (!dispatch || !pagination || !hostip || !appcode) return

    if (pagination.current > 0 && pagination.total > 0) {
      const totalPages = Math.ceil(pagination.total / pagination.pageSize)
      if (pagination.current >= totalPages) {
        message.info(`设备IP ${hostip} 已经是最后一页了！`)
        return
      }
    }

    setIsLoadingNextPage(true)
    dispatch({
      type: 'chddetail/queryHostipDetail',
      payload: {
        hostip,
        appcode,
        startTime,
        endTime,
        current: pagination.current + 1,
        pageSize: pagination.pageSize
      }
    })
  }, [dispatch, pagination, hostip, appcode, startTime, endTime])

  const paginationInfo = useMemo(() => {
    const totalPages = pagination
      ? Math.ceil(pagination.total / pagination.pageSize)
      : 1
    const isLastPage = pagination ? pagination.current >= totalPages : true

    const hasLoadedAllData =
      pagination &&
      ((pagination.total > 0 &&
        pagination.current > 0 &&
        pagination.current >=
          Math.ceil(pagination.total / pagination.pageSize)) ||
        hasReachedEnd)

    return { totalPages, isLastPage, hasLoadedAllData }
  }, [pagination, hasReachedEnd])

  const generateFileName = useCallback(() => {
    try {
      const deviceName = hostip || '汇总数据'
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
      return `QPS图表_${deviceName}_${timestamp}`
    } catch (error) {
      console.warn('生成文件名失败:', error)
      return `QPS图表_${Date.now()}`
    }
  }, [hostip])

  const option = useMemo(() => {
    if (!hasValidData) {
      return {
        backgroundColor: '#fff',
        title: { text: '暂无数据', left: 'center', top: 'center' },
        series: []
      }
    }

    return {
      backgroundColor: '#fff',
      animation: true,
      animationDuration: 2000,
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
            title: {
              zoom: '区域缩放',
              back: '重置缩放'
            }
          },
          restore: {
            show: true,
            title: '还原'
          }
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter(params) {
          try {
            if (params && params.length > 0) {
              const param = params[0]
              let deviceLabel = ''

              if (
                param.data &&
                param.data.isAggregated &&
                param.data.hostipContributors
              ) {
                const contributors = param.data.hostipContributors
                const hostipCount = contributors.length
                if (hostipCount <= 3) {
                  const contributorInfo = contributors
                    .map((c) => `${c.hostip}(${c.value})`)
                    .join(', ')
                  deviceLabel = `汇总设备: ${contributorInfo}`
                } else {
                  const firstThree = contributors
                    .slice(0, 3)
                    .map((c) => `${c.hostip}(${c.value})`)
                    .join(', ')
                  deviceLabel = `汇总设备: ${firstThree}... (共${hostipCount}个设备)`
                }
              } else if (
                param.data &&
                param.data.hostip &&
                param.data.hostip !== '汇总数据'
              ) {
                deviceLabel = `设备IP: ${param.data.hostip}`
              } else if (hostip && hostip !== '汇总数据') {
                deviceLabel = `设备IP: ${hostip}`
              } else {
                deviceLabel = '多设备汇总'
              }

              return `${deviceLabel}<br/>时间: ${param.name}<br/>QPS: ${param.value}`
            }
            return ''
          } catch (error) {
            console.warn('Tooltip格式化错误:', error)
            return ''
          }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          start: 0,
          end: 100,
          zoomLock: false
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          show: true,
          start: 0,
          end: 100,
          height: 26,
          bottom: 10
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          show: true,
          start: 0,
          end: 100,
          width: 26,
          top: 60,
          bottom: 60,
          right: 10
        }
      ],
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: processedData.categories || [],
        axisLabel: {
          show: true,
          color: '#666',
          fontSize: 12,
          rotate: 45,
          interval: 'auto'
        },
        axisLine: { show: true, lineStyle: { color: '#ddd' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          show: true,
          color: '#666',
          fontSize: 12,
          formatter: (value) => {
            try {
              // 保留完整的小数值，不进行截断
              return String(value)
            } catch (error) {
              console.warn('Y轴标签格式化错误:', error)
              return value
            }
          }
        },
        axisLine: { show: true, lineStyle: { color: '#ddd' } },
        splitLine: {
          show: true,
          lineStyle: { color: '#f0f0f0', type: 'dashed' }
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        top: '10%',
        containLabel: true
      },
      series: [
        {
          name: 'QPS',
          type: 'line',
          data: (processedData.values || []).map((value, index) => {
            const dataPoint = {
              value: Number(value) || 0,
              hostip,
              time:
                (processedData.categories && processedData.categories[index]) ||
                '',
              dataIndex: index
            }

            if (
              hostip === '汇总数据' &&
              Array.isArray(hostipMapping) &&
              Array.isArray(hostipMapping[index])
            ) {
              dataPoint.hostipContributors = hostipMapping[index]
              dataPoint.isAggregated = true
            }

            return dataPoint
          }),
          smooth: true,
          symbol: 'circle',
          lineStyle: { color: '#1890ff', width: 2 },
          itemStyle: { color: '#1890ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
              ]
            }
          },
          showSymbol: true,
          symbolSize: 4,
          animation: true,
          animationDuration: 2500,
          animationEasing: 'cubicOut'
        }
      ]
    }
  }, [processedData, hostip, hostipMapping, generateFileName, hasValidData])

  useEffect(() => {
    return () => {
      setIsComponentMounted(false)

      // 立即清理，避免内存泄漏
      const cleanup = () => {
        if (chartRef.current) {
          try {
            const echartsInstance = chartRef.current.getEchartsInstance()
            if (echartsInstance && !echartsInstance.isDisposed()) {
              // 清理自定义wheel事件监听器（兼容3.8.5）
              try {
                const container = echartsInstance.getDom()
                if (container && container._wheelCleanup) {
                  container._wheelCleanup()
                  delete container._wheelCleanup
                }
              } catch (cleanupError) {
                console.warn('清理wheel监听器错误:', cleanupError)
              }

              // 清理所有事件监听器
              try {
                echartsInstance.off()
              } catch (offError) {
                console.warn('清理事件监听器错误:', offError)
              }

              // 销毁ECharts实例
              try {
                echartsInstance.dispose()
              } catch (disposeError) {
                console.warn('销毁ECharts实例错误:', disposeError)
              }
            }
          } catch (error) {
            console.warn('清理ECharts实例错误:', error)
          }

          // 清理引用
          chartRef.current = null
        }
      }

      // 立即执行清理，然后用少量延迟确保完成
      cleanup()
      const timeoutId = setTimeout(cleanup, 50)

      // 返回清理函数
      return () => {
        clearTimeout(timeoutId)
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
        暂无数据
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <ReactEcharts
        ref={chartRef}
        option={option}
        style={{ height: '460px', width: '100%' }}
        opts={{
          renderer: 'canvas',
          width: 'auto',
          height: 'auto',
          devicePixelRatio: 1
        }}
        notMerge={false}
        lazyUpdate={false}
        showLoading={false}
        onChartReady={() => {
          if (!isComponentMounted) return

          try {
            const echartsInstance =
              chartRef.current && chartRef.current.getEchartsInstance()
            if (echartsInstance && !echartsInstance.isDisposed()) {
              const container = echartsInstance.getDom()
              if (container) {
                // 清理之前的监听器（防止重复绑定）
                if (container._wheelCleanup) {
                  container._wheelCleanup()
                  delete container._wheelCleanup
                }

                // ECharts 3.8.5兼容的滚轮事件处理
                const handleWheel = (e) => {
                  // 检查组件是否仍然挂载和实例是否有效
                  if (
                    !isComponentMounted ||
                    !echartsInstance ||
                    echartsInstance.isDisposed()
                  ) {
                    return
                  }

                  // 阻止默认滚动行为
                  e.preventDefault()
                  e.stopPropagation()

                  try {
                    const delta = e.deltaY || e.wheelDelta || 0
                    if (Math.abs(delta) < 1) return

                    const zoomIn = delta < 0

                    // ECharts 3.8.5兼容的X轴缩放
                    echartsInstance.dispatchAction({
                      type: 'dataZoom',
                      dataZoomIndex: 0,
                      start: zoomIn ? 10 : 0,
                      end: zoomIn ? 90 : 100
                    })
                  } catch (actionError) {
                    console.debug(
                      'DataZoom action failed:',
                      actionError.message
                    )
                  }
                }

                // 使用非passive监听器
                container.addEventListener('wheel', handleWheel, {
                  passive: false,
                  capture: true
                })

                // 存储清理函数
                container._wheelCleanup = () => {
                  try {
                    container.removeEventListener('wheel', handleWheel, {
                      passive: false,
                      capture: true
                    })
                  } catch (error) {
                    console.warn('移除监听器错误:', error)
                  }
                }

                console.debug('LineChart1 ready (ECharts 3.8.5 compatible)')
              }
            }
          } catch (error) {
            console.warn('ECharts wheel handler setup error:', error)
          }
        }}
      />

      {pagination && (
        <div style={{ marginTop: '10px', minHeight: '60px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#666',
              fontSize: '12px',
              marginBottom: '10px'
            }}
          >
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #91d5ff',
                borderRadius: 4,
                padding: '2px 6px',
                color: '#1890ff',
                fontWeight: 500
              }}
            >
              {pagination.current === 0
                ? '初始数据'
                : `第${Math.max(pagination.current, 1)}页`}
              {pagination.current > 0 &&
                pagination.total > 0 &&
                ` / 共${paginationInfo.totalPages}页`}
            </div>
            <div
              style={{
                background: paginationInfo.hasLoadedAllData
                  ? '#f6ffed'
                  : '#f0f9ff',
                border: paginationInfo.hasLoadedAllData
                  ? '1px solid #b7eb8f'
                  : '1px solid #91d5ff',
                borderRadius: 4,
                padding: '2px 6px',
                color: paginationInfo.hasLoadedAllData ? '#52c41a' : '#1890ff',
                fontWeight: 500
              }}
            >
              已加载{actualLoadedCount}条
              {pagination.total > 0 && ` / 共${pagination.total}条`}
              {paginationInfo.hasLoadedAllData && ' (已全部加载)'}
              {isGettingTotal && ' (获取总数中...)'}
              {isInitialData && ' (初始数据)'}
            </div>
          </div>

          {!paginationInfo.hasLoadedAllData && (
            <div style={{ textAlign: 'center' }}>
              <Button
                type='primary'
                size='small'
                loading={isLoadingNextPage}
                onClick={loadNextPage}
                disabled={isLoadingNextPage}
              >
                {isLoadingNextPage ? '加载中...' : '加载下一页'}
              </Button>
            </div>
          )}
        </div>
      )}

      {!pagination && hasValidData && (
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #91d5ff',
              borderRadius: 4,
              padding: '4px 8px',
              color: '#1890ff',
              fontWeight: 500,
              fontSize: '12px',
              display: 'inline-block'
            }}
          >
            汇总数据点：{actualLoadedCount}条
          </div>
        </div>
      )}
    </div>
  )
}

LineChart1.propTypes = {
  data: PropTypes.object,
  dispatch: PropTypes.func,
  pagination: PropTypes.object,
  hostip: PropTypes.string,
  appcode: PropTypes.string,
  startTime: PropTypes.number,
  endTime: PropTypes.number,
  hostipMapping: PropTypes.array
}

export default LineChart1
