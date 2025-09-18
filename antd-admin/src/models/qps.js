import { message } from 'antd'
import NProgress from 'nprogress'
import queryString from 'query-string'
import moment from 'moment'
import { peformanceCfg } from '../utils/performanceOelCfg'
import { configureQpsDSLTemplate } from '../utils/dslQueryCfg'
import { getPerfQpsIndexName } from '../utils/esIndexNameConfig'
import { queryQpsService } from '../services/qps'

moment.locale('zh-cn')

const DEFAULT_ROLE = '其他设备'
const DEFAULT_TIME_RANGE_SECONDS = 3600

const determineRole = (deviceInfo) => {
  if (!deviceInfo || typeof deviceInfo !== 'object') {
    return DEFAULT_ROLE
  }

  const { appcode } = deviceInfo

  if (appcode && typeof appcode === 'string' && appcode.trim() !== '') {
    return appcode.trim()
  }

  return DEFAULT_ROLE
}

const safeGetSource = (hit) => {
  if (!hit || !hit._source) {
    return {}
  }
  return hit._source
}

const safeGetValue = (value) => {
  if (value == null) return 0
  const numValue = Number(value)
  // 保留完整的小数值，不进行Math.round截断
  return Number.isNaN(numValue) ? 0 : numValue
}

const sortChartData = (chartData) => {
  if (
    !chartData.categories ||
    !chartData.categories.length ||
    !chartData.values ||
    !chartData.values.length
  ) {
    return { categories: [], values: [] }
  }

  const combined = chartData.categories.map((cat, idx) => ({
    time: cat,
    value: chartData.values[idx] || 0
  }))

  combined.sort((a, b) => {
    if (typeof a.time === 'number' && typeof b.time === 'number') {
      return a.time - b.time
    }
    return String(a.time).localeCompare(String(b.time))
  })

  return {
    categories: combined.map((item) => item.time),
    values: combined.map((item) => item.value)
  }
}

const processHostipData = (hostipBucket) => {
  const chartData = { categories: [], values: [] }

  const allValues =
    hostipBucket.all_values &&
    hostipBucket.all_values.hits &&
    hostipBucket.all_values.hits.hits
  if (!Array.isArray(allValues) || allValues.length === 0) {
    return chartData
  }

  chartData.categories = new Array(allValues.length)
  chartData.values = new Array(allValues.length)

  let validCount = 0

  for (let i = 0; i < allValues.length; i++) {
    const source = safeGetSource(allValues[i])
    const { clock } = source

    if (!clock || Number.isNaN(Number(clock))) {
      continue
    }

    const timeMoment = moment.unix(clock)
    if (!timeMoment.isValid()) {
      continue
    }

    const timeLabel = timeMoment.format('HH:mm')

    chartData.categories[validCount] = timeLabel
    chartData.values[validCount] = safeGetValue(source.value)
    validCount++
  }

  chartData.categories = chartData.categories.slice(0, validCount)
  chartData.values = chartData.values.slice(0, validCount)

  return sortChartData(chartData)
}

const processQpsData = (aggregations) => {
  try {
    if (
      !aggregations ||
      !aggregations.group_by_device ||
      !aggregations.group_by_device.buckets
    ) {
      console.warn('聚合数据格式错误')
      return []
    }

    const devices = aggregations.group_by_device.buckets
    const processedData = []

    for (const [index, device] of devices.entries()) {
      try {
        const latestInfo =
          device.latest_info &&
          device.latest_info.hits &&
          device.latest_info.hits.hits &&
          device.latest_info.hits.hits[0]
        if (!latestInfo) {
          console.warn(`设备 ${index} 缺少基础信息`)
          continue
        }

        const deviceInfo = safeGetSource(latestInfo)

        if (!deviceInfo.appcode) {
          console.warn(`设备 ${index} 缺少appcode`)
          continue
        }

        const hostipBuckets =
          (device.hostip_values && device.hostip_values.buckets) || []
        const role = determineRole(deviceInfo)

        if (hostipBuckets.length === 0) {
          processedData.push({
            key: `device-${index}-${deviceInfo.appcode}-default`,
            role,
            vendor: deviceInfo.vendor || '未知',
            device: deviceInfo.appcode,
            hostip: deviceInfo.hostip || '未知IP',
            chartData: { categories: [], values: [] }
          })
        } else {
          for (const [hostipIndex, hostipBucket] of hostipBuckets.entries()) {
            try {
              const hostip = hostipBucket.key || '未知IP'
              const chartData = processHostipData(hostipBucket)

              processedData.push({
                key: `device-${index}-${deviceInfo.appcode}-${hostip}-${hostipIndex}`,
                role,
                vendor: deviceInfo.vendor || '未知',
                device: deviceInfo.appcode,
                hostip,
                chartData
              })
            } catch (error) {
              console.warn(`处理hostip数据时出错 (${hostipBucket.key}):`, error)
            }
          }
        }
      } catch (error) {
        console.warn(`处理设备 ${index} 数据时出错:`, error)
      }
    }

    processedData.sort((a, b) => {
      if (a.role !== b.role) {
        return a.role.localeCompare(b.role)
      }
      return a.device.localeCompare(b.device)
    })

    return processedData
  } catch (error) {
    console.error('处理QPS数据时发生错误:', error)
    return []
  }
}

const processTimeParams = (payload) => {
  let startTime
  let endTime

  if (payload.startTime && payload.endTime) {
    startTime = Number(payload.startTime)
    endTime = Number(payload.endTime)

    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
      throw new Error('时间戳格式错误')
    }

    if (startTime >= endTime) {
      throw new Error('开始时间不能晚于或等于结束时间')
    }
  } else if (payload.date) {
    const targetMoment = moment(payload.date)
    if (!targetMoment.isValid()) {
      throw new Error('日期格式错误')
    }
    endTime = targetMoment.unix()
    startTime = targetMoment.subtract(6, 'hours').unix()
  } else {
    const nowMoment = moment()
    endTime = nowMoment.unix()
    startTime = nowMoment.subtract(DEFAULT_TIME_RANGE_SECONDS, 'seconds').unix()
  }

  return { startTime, endTime }
}

export default {
  namespace: 'qps',

  state: {
    q: '',
    list: [],
    loading: false,
    queryState: {
      selectedDateRange: null,
      lastQuery: null,
      isFromChdDetail: false
    }
  },

  subscriptions: {
    setup({ dispatch, history }) {
      return history.listen((location) => {
        try {
          let { query } = location
          if (query === undefined) {
            query = queryString.parse(location.search)
          }
          if (location.pathname === '/dashboard/qps') {
            dispatch({ type: 'query', payload: {} })
          }
          if (location.pathname === '/qps') {
            if (location.state && location.state.fromChdDetail) {
              dispatch({
                type: 'setFromChdDetail',
                payload: true
              })
            }
          }
        } catch (error) {
          console.error('路由监听错误:', error)
        }
      })
    }
  },

  effects: {
    *query({ payload }, { call, put, select }) {
      try {
        yield put({ type: 'setState', payload: { loading: true } })

        const currentState = yield select((state) => state.qps)
        if (!currentState.isFromChdDetail) {
          yield put({
            type: 'saveQueryState',
            payload: { lastQuery: payload }
          })
        }

        if (!peformanceCfg || !peformanceCfg.queryQpsAllPerformance) {
          throw new Error('DSL模板配置错误')
        }

        const dslTemplate = { ...peformanceCfg.queryQpsAllPerformance }
        const { startTime, endTime } = processTimeParams(payload)

        if (
          !dslTemplate.query ||
          !dslTemplate.query.bool ||
          !dslTemplate.query.bool.must
        ) {
          throw new Error('DSL模板格式错误')
        }

        const configuredDSL = configureQpsDSLTemplate(
          dslTemplate,
          startTime,
          endTime
        )

        // 获取查询路径
        const queryPath = getPerfQpsIndexName({ startTime, endTime })

        const queryParams = {
          es: configuredDSL,
          paths: queryPath
        }

        const data = yield call(queryQpsService, queryParams)

        NProgress.done()

        if (data && data.aggregations) {
          const processedData = processQpsData(data.aggregations)

          yield put({
            type: 'setState',
            payload: {
              list: processedData,
              q: payload.q || '',
              loading: false
            }
          })
        } else {
          yield put({
            type: 'setState',
            payload: {
              list: [],
              q: payload.q || '',
              loading: false
            }
          })
        }
      } catch (error) {
        NProgress.done()
        message.error(`查询QPS数据失败: ${error.message || '未知错误'}`)
        yield put({
          type: 'setState',
          payload: {
            list: [],
            q: payload.q || '',
            loading: false
          }
        })
      }
    }
  },

  reducers: {
    setState(state, action) {
      return { ...state, ...action.payload }
    },
    saveQueryState(state, action) {
      return {
        ...state,
        queryState: {
          ...state.queryState,
          ...action.payload
        }
      }
    },
    setFromChdDetail(state, action) {
      return {
        ...state,
        queryState: {
          ...state.queryState,
          isFromChdDetail: action.payload
        }
      }
    },
    clearFromChdDetail(state) {
      return {
        ...state,
        queryState: {
          ...state.queryState,
          isFromChdDetail: false
        }
      }
    }
  }
}
