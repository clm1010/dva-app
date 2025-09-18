import { message } from 'antd'
import queryString from 'query-string'
import _ from 'lodash'
import { peformanceCfg } from '../utils/performanceOelCfg'
import {
  queryRoleDetailService,
  queryHostipDetailService
} from '../services/chddetail'
import {
  configureRoleDetailDSLTemplate,
  configureHostipDetailDSLTemplate
} from '../utils/dslQueryCfg'
import { getPerfQpsIndexName } from '../utils/esIndexNameConfig'

// 安全的数据提取函数 - ES6箭头函数
const safeGetSource = (hit) => {
  if (!hit || !hit._source) {
    return {}
  }
  return hit._source
}

// 安全的数值处理函数 - ES6箭头函数
const safeGetValue = (value) => {
  if (_.isNil(value)) return 0

  const numValue = Number(value)
  // 保留完整的小数值，不进行Math.round截断
  return _.isNaN(numValue) ? 0 : numValue
}

// 验证数组数据 - ES6语法
const validateArrayData = (data, fieldName = 'data') => {
  if (!_.isArray(data)) {
    console.warn(`${fieldName} 不是数组:`, data)
    return false
  }
  return true
}

// 验证对象数据 - ES6语法
const validateObjectData = (data, requiredFields = []) => {
  if (!_.isObject(data) || _.isArray(data) || _.isNull(data)) {
    console.warn('数据不是对象:', data)
    return false
  }

  const missingFields = _.difference(requiredFields, _.keys(data))
  if (!_.isEmpty(missingFields)) {
    console.warn(`缺少必需字段 ${missingFields.join(', ')}:`, data)
    return false
  }

  return true
}

// 处理角色详情QPS数据 - ES6箭头函数优化
const processRoleDetailData = (aggregations) => {
  try {
    // eslint-disable-next-line camelcase
    if (!validateObjectData(aggregations, ['group_by_hostip'])) {
      console.warn('聚合数据格式错误')
      return []
    }

    // eslint-disable-next-line camelcase
    const { group_by_hostip: groupByHostip } = aggregations
    if (
      !validateObjectData(groupByHostip, ['buckets']) ||
      !validateArrayData(groupByHostip.buckets, 'hostip buckets')
    ) {
      console.warn('hostip分组数据格式错误')
      return []
    }

    const { buckets: hostips } = groupByHostip
    const processedData = []

    _.forEach(hostips, (hostip, index) => {
      try {
        const hostipValue = hostip.key || '未知IP'

        // 获取该hostip的基本信息 - 使用lodash优化
        // eslint-disable-next-line camelcase
        const latestInfo = _.get(hostip, 'latest_info.hits.hits[0]')
        const deviceInfo = latestInfo ? safeGetSource(latestInfo) : {}

        // 获取时间序列数据 - 使用lodash优化
        // eslint-disable-next-line camelcase
        const timeSeriesHits = _.get(hostip, 'time_series.hits.hits')
        if (!validateArrayData(timeSeriesHits, 'time_series hits')) {
          console.warn(`设备IP ${hostipValue} 缺少时间序列数据`)
          return
        }

        // 提取图表数据 - 使用lodash优化
        const validData = _.compact(
          _.map(timeSeriesHits, (hit) => {
            try {
              const source = safeGetSource(hit)
              const { clock, value } = source

              if (!clock || _.isNaN(Number(clock))) {
                return null
              }

              const date = new Date(clock * 1000)
              if (_.isNaN(date.getTime())) {
                return null
              }

              return {
                time: clock,
                value: safeGetValue(value)
              }
            } catch (hitError) {
              console.warn('处理时间序列数据点错误:', hitError)
              return null
            }
          })
        )

        // 按时间排序 - 使用lodash优化
        const sortedData = _.sortBy(validData, (item) => {
          try {
            return _.isNumber(item.time) ? item.time : Number(item.time)
          } catch (sortError) {
            console.warn('时间排序错误:', sortError)
            return 0
          }
        })

        const chartData = {
          categories: _.map(sortedData, 'time'),
          values: _.map(sortedData, 'value')
        }

        processedData.push({
          key: `hostip-${index}-${hostipValue}`,
          hostip: hostipValue,
          vendor: deviceInfo.vendor || '未知',
          device: deviceInfo.appcode || '未知设备',
          role: deviceInfo.appcode || '未知角色',
          chartData
        })
      } catch (error) {
        console.warn(`处理hostip ${hostip.key} 数据时出错:`, error)
      }
    })

    // 按IP排序 - 使用lodash优化
    return _.sortBy(processedData, 'hostip')
  } catch (error) {
    console.error('处理角色详情数据时发生错误:', error)
    return []
  }
}

// 验证时间戳参数 - ES6箭头函数优化
const validateTimestamps = (startTime, endTime) => {
  const now = Math.floor(Date.now() / 1000)

  if (_.isNil(startTime) || _.isNil(endTime)) {
    return { valid: false, message: '时间戳参数不能为空' }
  }

  const startTimeNum = Number(startTime)
  const endTimeNum = Number(endTime)

  if (_.isNaN(startTimeNum) || _.isNaN(endTimeNum)) {
    return { valid: false, message: '时间戳格式错误' }
  }

  if (startTimeNum >= endTimeNum) {
    return { valid: false, message: '开始时间不能晚于或等于结束时间' }
  }

  if (endTimeNum > now) {
    return { valid: false, message: '结束时间不能是未来时间' }
  }

  const timeDiff = endTimeNum - startTimeNum
  const maxDays = 30 * 24 * 60 * 60 // 30天
  if (timeDiff > maxDays) {
    return { valid: false, message: '查询时间范围不能超过30天' }
  }

  return { valid: true }
}

// 安全的服务调用 - ES6箭头函数
const safeServiceCall = function* (
  serviceFunction,
  params,
  serviceName,
  { call }
) {
  try {
    const result = yield call(serviceFunction, params)
    return result
  } catch (error) {
    console.error(`${serviceName}服务调用失败:`, error)
    throw error
  }
}

// 处理设备IP图表数据排序 - 新增辅助方法
const sortChartData = (categories, values) => {
  if (_.isEmpty(categories) || categories.length <= 1) {
    return { categories, values }
  }

  const combined = _.zipWith(categories, values, (cat, val) => ({
    time: cat,
    value: val
  }))

  const sorted = _.sortBy(combined, (item) => {
    try {
      return _.isNumber(item.time) ? item.time : Number(item.time)
    } catch (sortError) {
      console.warn('时间排序错误:', sortError)
      return 0
    }
  })

  return {
    categories: _.map(sorted, 'time'),
    values: _.map(sorted, 'value')
  }
}

export default {
  namespace: 'chddetail',

  state: {
    list: [], // 角色下所有设备IP的数据
    loading: false,
    roleInfo: {}, // 角色基本信息
    hostipDetails: {}, // 单个设备IP的详细数据，key为hostip
    hostipPagination: {} // 单个设备IP的分页信息，key为hostip
  },

  subscriptions: {
    setup({ dispatch, history }) {
      return history.listen((location) => {
        try {
          let { query } = location
          if (_.isUndefined(query)) {
            query = queryString.parse(location.search)
          }
          if (location.pathname === '/qps/chddetail') {
            // 从location.state获取传递的参数
            const { state } = location
            if (validateObjectData(state, ['role'])) {
              dispatch({
                type: 'query',
                payload: {
                  appcode: state.role,
                  roleInfo: state,
                  // 传递时间范围参数
                  startTime: _.get(state, 'timeRange.startTime'),
                  endTime: _.get(state, 'timeRange.endTime')
                }
              })
            } else {
              console.warn('路由状态数据无效:', state)
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
      console.log('角色详情查询开始, payload:', payload)

      try {
        yield put({ type: 'setState', payload: { loading: true } })

        const { appcode, roleInfo = {} } = payload

        if (!appcode || !_.isString(appcode)) {
          message.error('缺少有效的角色参数')
          yield put({ type: 'setState', payload: { loading: false } })
          return
        }

        // 保存角色信息
        yield put({ type: 'setState', payload: { roleInfo } })

        // 安全获取DSL模板
        if (!peformanceCfg || !peformanceCfg.queryRoleDetailPerformance) {
          throw new Error('DSL模板不存在')
        }

        // 设置时间范围 - 优先使用传递的时间范围
        let startTime
        let endTime
        if (payload.startTime && payload.endTime) {
          startTime = Number(payload.startTime)
          endTime = Number(payload.endTime)

          const validation = validateTimestamps(startTime, endTime)
          if (!validation.valid) {
            message.error(validation.message)
            yield put({ type: 'setState', payload: { loading: false } })
            return
          }

          console.log('使用传递的时间范围:', {
            startTime,
            endTime,
            startTimeDate: new Date(startTime * 1000).toLocaleString('zh-CN'),
            endTimeDate: new Date(endTime * 1000).toLocaleString('zh-CN')
          })
        } else {
          // 默认查询当前时间前6小时
          endTime = Math.floor(Date.now() / 1000)
          startTime = endTime - 6 * 60 * 60

          console.log('使用默认时间范围:', {
            startTime,
            endTime,
            startTimeDate: new Date(startTime * 1000).toLocaleString('zh-CN'),
            endTimeDate: new Date(endTime * 1000).toLocaleString('zh-CN')
          })
        }

        // 配置DSL模板
        const configuredDSL = configureRoleDetailDSLTemplate(
          peformanceCfg.queryRoleDetailPerformance,
          startTime,
          endTime,
          appcode
        )

        console.log(
          '角色详情DSL查询语句:',
          JSON.stringify(configuredDSL, null, 2)
        )

        // 获取查询路径
        const queryPath = getPerfQpsIndexName({ startTime, endTime })

        const queryParams = {
          es: configuredDSL,
          paths: queryPath
        }

        const data = yield* safeServiceCall(
          queryRoleDetailService,
          queryParams,
          '角色详情查询',
          { call }
        )
        console.log('角色详情ES查询结果:', data)

        if (data && data.aggregations) {
          console.log('开始处理角色详情聚合数据...')
          const processedData = processRoleDetailData(data.aggregations)
          console.log('处理后的角色详情数据:', processedData)

          // 为每个设备IP初始化分页数据 - 使用lodash优化
          const initialHostipDetails = {}
          const initialHostipPagination = {}

          _.forEach(processedData, (item) => {
            if (item.hostip) {
              // 初始化每个设备IP的详细数据
              initialHostipDetails[item.hostip] = item.chartData
              // 初始化每个设备IP的分页信息
              initialHostipPagination[item.hostip] = {
                current: 0, // 设置为0表示还没有进行过分页查询
                pageSize: 100,
                total: 0 // 初始设置为0，将通过分页查询获取真实总数
              }
            }
          })

          yield put({
            type: 'setState',
            payload: {
              list: processedData,
              hostipDetails: initialHostipDetails,
              hostipPagination: initialHostipPagination,
              loading: false
            }
          })

          // 逐个为每个设备IP获取第一页真实数据和总数（顺序执行，确保数据完整性）
          for (const item of processedData) {
            try {
              if (!item.hostip) continue

              // 构建查询参数
              if (
                !peformanceCfg ||
                !peformanceCfg.queryHostipDetailPerformance
              ) {
                throw new Error('设备IP详情DSL模板不存在')
              }

              const hostipDslTemplate = configureHostipDetailDSLTemplate(
                peformanceCfg.queryHostipDetailPerformance,
                startTime,
                endTime,
                item.hostip,
                appcode
              )

              // 获取第一页数据（100条）
              _.assign(hostipDslTemplate, {
                from: 0,
                size: 100
              })

              const hostipQueryPath = getPerfQpsIndexName({
                startTime,
                endTime
              })

              const hostipQueryParams = {
                es: hostipDslTemplate,
                paths: hostipQueryPath
              }

              // 同步调用查询服务
              const hostipData = yield* safeServiceCall(
                queryHostipDetailService,
                hostipQueryParams,
                '设备IP详情查询',
                { call }
              )

              if (hostipData && hostipData.hits) {
                // 处理第一页真实数据
                const categories = []
                const values = []

                if (validateArrayData(hostipData.hits.hits, 'hits数据')) {
                  _.forEach(hostipData.hits.hits, (hit) => {
                    try {
                      const source = hit._source || {}
                      const { clock, value } = source

                      if (clock) {
                        categories.push(clock)
                        values.push(safeGetValue(value))
                      }
                    } catch (hitError) {
                      console.warn('处理单个hit数据错误:', hitError)
                    }
                  })
                }

                // 按时间排序 - 使用lodash优化
                const sortedData = sortChartData(categories, values)

                // 更新状态
                const currentState = yield select((state) => state.chddetail)
                const updatedDetails = {
                  ...currentState.hostipDetails,
                  [item.hostip]: sortedData
                }

                const updatedPagination = {
                  ...currentState.hostipPagination,
                  [item.hostip]: {
                    current: 1,
                    pageSize: 100,
                    total: _.get(
                      hostipData,
                      'hits.total.value',
                      _.get(hostipData, 'hits.total', 0)
                    )
                  }
                }

                yield put({
                  type: 'setState',
                  payload: {
                    hostipDetails: updatedDetails,
                    hostipPagination: updatedPagination
                  }
                })
              }
            } catch (itemError) {
              console.error(`处理设备IP ${item.hostip} 时出错:`, itemError)
              // 跳过失败的设备IP，继续处理下一个
              continue
            }
          }
        } else {
          console.warn('没有聚合数据或查询失败:', data)
          yield put({
            type: 'setState',
            payload: {
              list: [],
              loading: false
            }
          })
        }
      } catch (error) {
        console.error('角色详情查询失败:', error)
        message.error(`查询角色详情数据失败: ${error.message || '未知错误'}`)
        yield put({
          type: 'setState',
          payload: {
            list: [],
            loading: false
          }
        })
      }
    },

    // 查询单个设备IP的详细数据（支持分页）
    *queryHostipDetail({ payload }, { call, put, select }) {
      try {
        const {
          hostip,
          appcode,
          startTime,
          endTime,
          current = 1,
          pageSize = 100
        } = payload

        // 参数验证 - 使用lodash优化
        if (!hostip || !_.isString(hostip)) {
          message.error('设备IP参数无效')
          return
        }

        if (!appcode || !_.isString(appcode)) {
          message.error('应用代码参数无效')
          return
        }

        const validation = validateTimestamps(startTime, endTime)
        if (!validation.valid) {
          message.error(validation.message)
          return
        }

        // 获取当前状态
        const currentState = yield select((state) => state.chddetail)
        const currentDetails = _.get(currentState.hostipDetails, hostip, {
          categories: [],
          values: []
        })

        // 设置加载状态
        yield put({
          type: 'setState',
          payload: {
            loading: true
          }
        })

        // 安全获取DSL模板
        if (!peformanceCfg || !peformanceCfg.queryHostipDetailPerformance) {
          throw new Error('设备IP详情DSL模板不存在')
        }

        const dslTemplate = configureHostipDetailDSLTemplate(
          peformanceCfg.queryHostipDetailPerformance,
          startTime,
          endTime,
          hostip,
          appcode
        )

        // 设置分页
        if (current === 0) {
          // 只获取总数，不获取实际数据
          _.assign(dslTemplate, {
            from: 0,
            size: 0
          })
        } else {
          _.assign(dslTemplate, {
            from: (current - 1) * pageSize,
            size: pageSize
          })
        }

        console.log(
          '设备IP详情DSL查询语句:',
          JSON.stringify(dslTemplate, null, 2)
        )

        const queryPath = getPerfQpsIndexName({ startTime, endTime })

        const queryParams = {
          es: dslTemplate,
          paths: queryPath
        }

        const data = yield* safeServiceCall(
          queryHostipDetailService,
          queryParams,
          '设备IP详情查询',
          { call }
        )
        console.log('设备IP详情ES查询结果:', data)

        if (data && data.hits) {
          if (current === 0) {
            // 只获取总数的查询，只更新分页信息
            const updatedPagination = {
              ...currentState.hostipPagination,
              [hostip]: {
                ..._.get(currentState.hostipPagination, hostip),
                total: _.get(
                  data,
                  'hits.total.value',
                  _.get(data, 'hits.total', 0)
                )
              }
            }

            yield put({
              type: 'setState',
              payload: {
                hostipPagination: updatedPagination,
                loading: false
              }
            })
          } else if (validateArrayData(data.hits.hits, 'hits数据')) {
            // 正常的分页查询，更新数据和分页信息
            const newCategories = []
            const newValues = []

            _.forEach(data.hits.hits, (hit) => {
              try {
                const source = hit._source || {}
                const { clock, value } = source

                if (clock) {
                  newCategories.push(clock)
                  newValues.push(parseFloat(value) || 0)
                }
              } catch (hitError) {
                console.warn('处理单个hit数据错误:', hitError)
              }
            })

            // 更新设备IP详情数据
            const updatedDetails = {
              ...currentState.hostipDetails,
              [hostip]:
                current === 1
                  ? { categories: newCategories, values: newValues }
                  : { categories: [...currentDetails.categories, ...newCategories],
                    values: [...currentDetails.values, ...newValues] }
            }

            // 更新分页信息
            const updatedPagination = {
              ...currentState.hostipPagination,
              [hostip]: {
                current,
                pageSize,
                total: _.get(
                  data,
                  'hits.total.value',
                  _.get(data, 'hits.total', 0)
                )
              }
            }

            yield put({
              type: 'setState',
              payload: {
                hostipDetails: updatedDetails,
                hostipPagination: updatedPagination,
                loading: false
              }
            })
          }
        } else {
          console.warn('没有查询到设备IP详情数据:', data)
          yield put({
            type: 'setState',
            payload: {
              loading: false
            }
          })
        }
      } catch (error) {
        console.error('查询设备IP详情失败:', error)
        message.error(`查询设备IP详情失败: ${error.message || '未知错误'}`)
        yield put({
          type: 'setState',
          payload: {
            loading: false
          }
        })
      }
    }
  },

  reducers: {
    setState(state, action) {
      return { ...state, ...action.payload }
    }
  }
}
