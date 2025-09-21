/* eslint-disable camelcase */
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from 'echarts-for-react'
import moment from 'moment'
import { Button, message, Spin } from 'antd'

moment.locale('zh-cn')

// 数据验证函数
const validateData = (xAxisData, seriesData) => {
  const safeXAxis = Array.isArray(xAxisData) ? xAxisData : []
  const safeSeries = Array.isArray(seriesData) ? seriesData : []
  return { xAxis: safeXAxis, series: safeSeries }
}

// 安全获取Y轴名称
const getYAxisName = (yAxisData) => {
  try {
    if (typeof yAxisData === 'string') return yAxisData
    if (Array.isArray(yAxisData) && yAxisData.length > 0) return yAxisData[0]
    return '值'
  } catch (error) {
    console.warn('Y轴名称解析错误:', error)
    return '值'
  }
}

const PerChart = ({
  dispatch,
  xAxisData,
  yAxisData,
  chartObj,
  seriesData,
  loading,
  pagination,
  ip_addr,
  rangeMoment
}) => {
  console.log(
    {
      dispatch,
      xAxisData,
      yAxisData,
      chartObj,
      seriesData,
      loading,
      pagination,
      ip_addr,
      rangeMoment
    },
    'props'
  )

  const chartRef = useRef(null)
  const [accumulatedData, setAccumulatedData] = useState({
    xAxis: [],
    series: []
  })
  const [isComponentMounted, setIsComponentMounted] = useState(true)

  // 数据验证
  const validatedData = useMemo(
    () => validateData(xAxisData, seriesData),
    [xAxisData, seriesData]
  )

  // 初始化数据
  useEffect(() => {
    if (!isComponentMounted) return

    if (
      !loading &&
      validatedData.xAxis.length > 0 &&
      validatedData.series.length > 0
    ) {
      if (pagination.current === 1) {
        setAccumulatedData({
          xAxis: [...validatedData.xAxis],
          series: [...validatedData.series]
        })
      } else {
        setAccumulatedData((prev) => ({
          xAxis: [...(prev.xAxis || []), ...validatedData.xAxis],
          series: [...(prev.series || []), ...validatedData.series]
        }))
      }
    }
  }, [
    validatedData.xAxis,
    validatedData.series,
    loading,
    pagination.current,
    isComponentMounted
  ])

  // 生成文件名
  const generateFileName = useCallback(() => {
    try {
      const deviceName = chartObj.hostname || ip_addr || '性能图表'
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')
      return `性能曲线_${deviceName}_${timestamp}`
    } catch (error) {
      console.warn('生成文件名失败:', error)
      return `性能曲线_${Date.now()}`
    }
  }, [chartObj.hostname, ip_addr])

  // 获取图表配置
  const getOption = useCallback(() => {
    const hasData =
      accumulatedData.xAxis.length > 0 && accumulatedData.series.length > 0

    if (!hasData) {
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
      title: {
        text: '性能曲线',
        subtext: chartObj.source || '',
        textStyle: {
          color: '#333333',
          fontSize: 16,
          fontWeight: 'bold'
        },
        left: 'center',
        top: 0
      },
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
      grid: {
        left: '6%',
        top: '10%',
        right: '6%',
        bottom: '20%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params) => {
          try {
            if (!params || !params[0]) return ''
            const { name: date, value } = params[0]
            return `${chartObj.hostname || ''}<br/>${date || ''}<br/>${
              value || ''
            }`
          } catch (error) {
            console.warn('Tooltip格式化错误:', error)
            return ''
          }
        },
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderColor: '#333',
        textStyle: {
          color: '#FFF',
          fontSize: 12
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: accumulatedData.xAxis,
        name: '时间',
        nameLocation: 'end',
        axisLabel: {
          show: true,
          color: '#666',
          fontSize: 12,
          rotate: accumulatedData.xAxis.length > 10 ? 45 : 0,
          interval: 'auto'
        },
        axisLine: { show: true, lineStyle: { color: '#ddd' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: getYAxisName(yAxisData),
        nameLocation: 'end',
        min: (value) => Math.max(0, value.min - (value.max - value.min) * 0.1),
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
      series: [
        {
          name: chartObj.source || '',
          data: accumulatedData.series,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            normal: {
              width: 2,
              color: '#'
            },
            emphasis: {
              width: 4,
              color: '#1890ff'
            }
          },
          itemStyle: {
            normal: {
              color: '#1890ff'
            },
            emphasis: {
              color: '#1890ff'
            }
          },
          areaStyle: {
            normal: {
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
            }
          },
          showSymbol: true,
          animation: true,
          animationDuration: 2500,
          animationEasing: 'cubicOut'
        }
      ],
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
      ]
    }
  }, [accumulatedData, chartObj, yAxisData, generateFileName])

  // 加载下一页
  const loadNextPage = useCallback(() => {
    if (!dispatch || !pagination) return

    const totalPages = Math.ceil(pagination.total / pagination.pageSize)

    if (pagination.current >= totalPages) {
      message.info('已经是最后一页了！')
      return
    }

    dispatch({
      type: 'performHost/handleChartPaginationChange',
      payload: {
        current: pagination.current + 1,
        pageSize: pagination.pageSize
      }
    })
  }, [dispatch, pagination])

  // 判断是否有数据
  const hasData = useMemo(
    () => accumulatedData.series.length > 0,
    [accumulatedData.series.length]
  )

  // 计算总页数
  const totalPages = useMemo(
    () => Math.ceil(pagination.total / pagination.pageSize),
    [pagination.total, pagination.pageSize]
  )

  // 判断是否是最后一页
  const isLastPage = useMemo(
    () => pagination.current >= totalPages,
    [pagination.current, totalPages]
  )

  const loadingSpinner = useMemo(
    () => (
      <div
        style={{
          height: 500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#fafafa'
        }}
      >
        <Spin tip='加载数据中...' size='large' />
      </div>
    ),
    []
  )

  const noDataDisplay = useMemo(
    () => (
      <div
        style={{
          height: 500,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#fafafa',
          border: '1px dashed #ddd',
          flexDirection: 'column'
        }}
      >
        <h3 style={{ margin: 0, color: '#666' }}>暂无数据</h3>
        <p style={{ margin: 0, color: '#999' }}>当前没有可显示的图表数据</p>
      </div>
    ),
    []
  )

  const topInfoSection = useMemo(
    () => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          marginBottom: 16,
          padding: '0 16px'
        }}
      >
        <div style={{ fontWeight: 500, color: '#333' }}>
          {chartObj.hostname ? `主机：${chartObj.hostname}` : ''}
          {chartObj.source ? ` | 指标：${chartObj.source}` : ''}
        </div>
      </div>
    ),
    [chartObj.hostname, chartObj.source]
  )

  const bottomInfoSection = useMemo(
    () => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
          padding: '0 16px',
          color: '#666',
          fontSize: 12
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #91d5ff',
              borderRadius: 4,
              padding: '4px 8px',
              color: '#1890ff',
              fontWeight: 500
            }}
          >
            第{pagination.current}页 / 共{totalPages}页
          </div>
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #91d5ff',
              borderRadius: 4,
              padding: '4px 8px',
              color: '#1890ff',
              fontWeight: 500
            }}
          >
            已加载{accumulatedData.series.length}条
            {accumulatedData.series.length < pagination.total &&
              ` / 共${pagination.total}条`}
          </div>
        </div>
        <div>
          {rangeMoment &&
            rangeMoment.length === 2 &&
            rangeMoment[0] &&
            rangeMoment[1] && (
              <span
                style={{
                  background: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: 4,
                  padding: '4px 8px',
                  color: '#fa8c16',
                  fontWeight: 500
                }}
              >
                时间范围：{rangeMoment[0].format('YYYY-MM-DD HH:mm:ss')} 至{' '}
                {rangeMoment[1].format('YYYY-MM-DD HH:mm:ss')}
              </span>
            )}
        </div>
      </div>
    ),
    [
      accumulatedData.series.length,
      pagination.total,
      rangeMoment,
      pagination.current,
      totalPages
    ]
  )

  // 组件卸载清理
  useEffect(() => {
    return () => {
      setIsComponentMounted(false)

      // ECharts 3.8.5 兼容的清理逻辑
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

  if (loading && pagination.current === 1) {
    return loadingSpinner
  }

  if (!hasData || pagination.total === 0) {
    return noDataDisplay
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* 顶部信息 */}
      {topInfoSection}
      {/* Echarts */}
      <div style={{ position: 'relative', height: 500 }}>
        {loading && pagination.current > 1 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255,255,255, 0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10
            }}
          >
            <Spin tip='加载更多数据...' />
          </div>
        )}
        <ReactEcharts
          ref={chartRef}
          option={getOption()}
          style={{ height: '100%', width: '100%' }}
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

                  console.debug('PerChart ready (ECharts 3.8.5 compatible)')
                }
              }
            } catch (error) {
              console.warn('ECharts wheel handler setup error:', error)
            }
          }}
        />
      </div>
      {/* 加载下一页按钮 */}
      {!isLastPage && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 16
          }}
        >
          <Button
            type='primary'
            onClick={loadNextPage}
            loading={loading}
            disabled={loading || isLastPage}
            style={{ width: 200, height: 40 }}
          >
            加载下一页
          </Button>
        </div>
      )}
      {/* 底部信息 */}
      {bottomInfoSection}
    </div>
  )
}

PerChart.propTypes = {
  dispatch: PropTypes.func,
  xAxisData: PropTypes.array,
  yAxisData: PropTypes.string,
  chartObj: PropTypes.object,
  seriesData: PropTypes.array,
  loading: PropTypes.bool,
  pagination: PropTypes.object,
  ip_addr: PropTypes.string,
  rangeMoment: PropTypes.array
}

export default PerChart
