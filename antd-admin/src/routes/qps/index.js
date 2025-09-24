import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'dva'
import { Link } from 'dva/router'
import { Row, Table, message } from 'antd'
import moment from 'moment'
import SearchZone from './SearchZone'
import LineChart from './LineChart.js'

moment.locale('zh-cn')

const customPanelStyle1 = {
  backgroundColor: '#fff',
  marginBottom: 16,
  padding: 16
}

const QpsPage = ({ dispatch, qpsData, loading }) => {
  const { list, queryState } = qpsData
  const initTimerRef = useRef(null)

  const [selectedDateRange, setSelectedDateRange] = useState(() => {
    if (queryState && queryState.selectedDateRange) {
      try {
        return [
          moment(queryState.selectedDateRange[0]),
          moment(queryState.selectedDateRange[1])
        ]
      } catch (error) {
        console.warn('恢复时间范围失败:', error)
      }
    }
    return [moment().startOf('day'), moment()]
  })

  // 从详情页返回时恢复状态
  useEffect(() => {
    if (queryState && queryState.isFromChdDetail) {
      if (queryState.selectedDateRange) {
        try {
          const restoredRange = [
            moment(queryState.selectedDateRange[0]),
            moment(queryState.selectedDateRange[1])
          ]
          setSelectedDateRange(restoredRange)

          if (queryState.lastQuery) {
            setTimeout(() => {
              dispatch({
                type: 'qps/query',
                payload: queryState.lastQuery
              })
            }, 100)
          }
        } catch (error) {
          console.warn('恢复查询状态失败:', error)
        }
      }
      dispatch({ type: 'qps/clearFromChdDetail' })
    }
  }, [queryState && queryState.isFromChdDetail, dispatch])

  // 默认查询
  useEffect(() => {
    if (queryState && queryState.isFromChdDetail) return undefined

    if (initTimerRef.current) clearTimeout(initTimerRef.current)

    initTimerRef.current = setTimeout(() => {
      dispatch({ type: 'qps/query', payload: {} })
    }, 100)

    return () => {
      if (initTimerRef.current) clearTimeout(initTimerRef.current)
    }
  }, [dispatch])

  const handleDateRangeChange = useCallback(
    (dates) => {
      if (dates && dates.length === 2) {
        const adjustedDates = [
          dates[0] || null,
          dates[1] || null
        ]
        setSelectedDateRange(adjustedDates)

        dispatch({
          type: 'qps/saveQueryState',
          payload: {
            selectedDateRange: adjustedDates
              ? adjustedDates.map((d) => d.toISOString())
              : null
          }
        })
      } else {
        setSelectedDateRange(dates)
        dispatch({
          type: 'qps/saveQueryState',
          payload: { selectedDateRange: null }
        })
      }
    },
    [dispatch]
  )

  const handleSearch = useCallback(() => {
    try {
      const payload = {}
      if (selectedDateRange && selectedDateRange[0] && selectedDateRange[1]) {
        const start = selectedDateRange[0]
        const end = selectedDateRange[1]

        if (start.isAfter(end)) {
          message.error('开始时间不能晚于结束时间')
          return
        }

        if (end.isAfter(moment())) {
          message.error('结束时间不能是未来时间')
          return
        }

        payload.startTime = Math.floor(start.valueOf() / 1000)
        payload.endTime = Math.floor(end.valueOf() / 1000)
        payload.timeRange = payload.endTime - payload.startTime
      }

      dispatch({ type: 'qps/query', payload })
    } catch (error) {
      message.error('查询参数处理失败')
    }
  }, [selectedDateRange, dispatch])

  const handleReset = useCallback(() => {
    const resetRange = [moment().startOf('day'), moment()]
    setSelectedDateRange(resetRange)

    dispatch({
      type: 'qps/saveQueryState',
      payload: {
        selectedDateRange: resetRange.map((d) => d.toISOString())
      }
    })

    setTimeout(() => {
      dispatch({ type: 'qps/query', payload: {} })
    }, 100)
  }, [dispatch])

  const safeList = useMemo(() => {
    return Array.isArray(list) ? list : []
  }, [list])

  const groupedData = useMemo(() => {
    const groups = new Map()

    safeList.forEach((item, index) => {
      const { role } = item
      if (!groups.has(role)) {
        groups.set(role, {
          start: index,
          count: 0,
          items: []
        })
      }
      const group = groups.get(role)
      group.count++
      group.items.push({ ...item, originalIndex: index })
    })

    return groups
  }, [safeList])

  const renderRole = useCallback(
    (text, record, index) => {
      const appName = text || '未知应用'
      const group = groupedData.get(text)

      if (!group) {
        return {
          children: (
            <Link
              to={{
                pathname: '/qps/chddetail',
                state: {
                  ...record,
                  timeRange: {
                    startTime:
                      selectedDateRange &&
                      selectedDateRange[0] &&
                      selectedDateRange[1]
                        ? Math.floor(selectedDateRange[0].valueOf() / 1000)
                        : null,
                    endTime:
                      selectedDateRange &&
                      selectedDateRange[0] &&
                      selectedDateRange[1]
                        ? Math.floor(selectedDateRange[1].valueOf() / 1000)
                        : null,
                    startTimeStr:
                      selectedDateRange && selectedDateRange[0]
                        ? selectedDateRange[0].format('YYYY-MM-DD HH:mm:ss')
                        : null,
                    endTimeStr:
                      selectedDateRange && selectedDateRange[1]
                        ? selectedDateRange[1].format('YYYY-MM-DD HH:mm:ss')
                        : null
                  }
                }
              }}
              title={appName}
            >
              {appName}
            </Link>
          ),
          props: { rowSpan: 1 }
        }
      }

      const isFirstInGroup = group.start === index

      return {
        children: (
          <Link
            to={{
              pathname: '/qps/chddetail',
              state: {
                ...record,
                timeRange: {
                  startTime:
                    selectedDateRange &&
                    selectedDateRange[0] &&
                    selectedDateRange[1]
                      ? Math.floor(selectedDateRange[0].valueOf() / 1000)
                      : null,
                  endTime:
                    selectedDateRange &&
                    selectedDateRange[0] &&
                    selectedDateRange[1]
                      ? Math.floor(selectedDateRange[1].valueOf() / 1000)
                      : null,
                  startTimeStr:
                    selectedDateRange && selectedDateRange[0]
                      ? selectedDateRange[0].format('YYYY-MM-DD HH:mm:ss')
                      : null,
                  endTimeStr:
                    selectedDateRange && selectedDateRange[1]
                      ? selectedDateRange[1].format('YYYY-MM-DD HH:mm:ss')
                      : null
                }
              }
            }}
            title={appName}
          >
            {appName}
          </Link>
        ),
        props: {
          rowSpan: isFirstInGroup ? group.count : 0
        }
      }
    },
    [groupedData, selectedDateRange]
  )

  const columns = useMemo(
    () => [
      {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
        width: '200px',
        render: renderRole
      },
      {
        title: '厂商',
        dataIndex: 'vendor',
        key: 'vendor',
        width: '80px',
        render: (text) => text || '未知'
      },
      {
        title: '设备名',
        dataIndex: 'device',
        key: 'device',
        width: '300px',
        render: (text) => text || '未知设备'
      },
      {
        title: '设备IP',
        dataIndex: 'hostip',
        key: 'hostip',
        width: '160px',
        render: (text) => text || '未知IP'
      },
      {
        title: '曲线图',
        dataIndex: 'chart',
        key: 'chart',
        width: '200px',
        render: (text, record, index) => {
          const chartData = (record && record.chartData) || {
            categories: [],
            values: []
          }
          return (
            <LineChart
              data={chartData}
              key={`chart-${record.hostip || index}`}
            />
          )
        }
      }
    ],
    [renderRole]
  )

  const isLoading = Boolean(
    loading && loading.effects && loading.effects['qps/query']
  )

  const zoneProps = useMemo(
    () => ({
      selectedDateRange,
      handleDateRangeChange,
      handleSearch,
      handleReset,
      loading: isLoading
    }),
    [selectedDateRange, handleDateRangeChange, handleSearch, handleReset, isLoading]
  )

  return (
    <div>
      <Row style={customPanelStyle1}>
        <SearchZone {...zoneProps} />
      </Row>
      <Row gutter={6}>
        <Table
          columns={columns}
          dataSource={safeList}
          bordered
          loading={isLoading}
          pagination={false}
          rowKey={(record, index) => record.key || `${record.hostip}-${index}`}
          scroll={{ x: 'max-content' }}
          size='middle'
        />
      </Row>
    </div>
  )
}

QpsPage.propTypes = {
  dispatch: PropTypes.func.isRequired,
  qpsData: PropTypes.object.isRequired,
  loading: PropTypes.object.isRequired
}

export default connect(({ qps, loading }) => ({
  qpsData: qps,
  loading
}))(QpsPage)
