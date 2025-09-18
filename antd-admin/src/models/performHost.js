/* eslint-disable camelcase */
import { message } from 'antd'
import _ from 'lodash'
import queryString from 'query-string'
import moment from 'moment'
import { query } from '../services/performHost'
import { getPerfHostIndexName } from '../utils/esIndexNameConfig'
import { configureHostPerfCurveDSLTemplate } from '../utils/dslQueryCfg'
import { peformanceCfg } from '../utils/performanceOelCfg'
import { safeParseInt } from '../utils/FunctionTool'

moment.locale('zh-cn')

// 默认分页配置 - 图表
const DEFAULT_CHART_PAGINATION = {
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条`,
  current: 1,
  pageSize: 100,
  total: 0,
  pageSizeOptions: ['50', '100', '200', '500', '1000']
}

// 默认分页配置 - 表格
const DEFAULT_TABLE_PAGINATION = {
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条`,
  current: 1,
  pageSize: 10,
  total: 0,
  pageSizeOptions: ['10', '20', '30', '40', '50', '60', '100', '200']
}

// 默认排序配置
const DEFAULT_SORTER = {
  field: 'clock_time',
  order: 'asc'
}

// 验证查询参数
const validateQueryParams = (payload) => {
  const errors = []

  if (!_.get(payload, 'FirstOccurrence')) {
    errors.push('没有传告警发生时间，无法进行查询')
  }

  if (!_.get(payload, 'itemid')) {
    errors.push('没有传itemid，无法进行查询')
  }

  return errors
}

// 处理时间戳 - 类型安全版本
const processTimestamp = (timestamp) => {
  try {
    if (!timestamp) return null

    // 确保timestamp是字符串类型
    const timestampStr = _.toString(timestamp)

    if (!timestampStr || timestampStr === 'null' || timestampStr === 'undefined') {
      return null
    }

    // 实时告警和历史告警的时间戳不一样，历史告警多了000
    if (timestampStr.length === 13) {
      return timestampStr.substring(0, 10)
    }

    return timestampStr
  } catch (error) {
    console.warn('时间戳处理错误:', error, timestamp)
    return null
  }
}

// 处理查询结果 - 增强安全性
const processQueryResult = (data, payload, pagination, rangeMoment) => {
  try {
    // 验证数据结构
    if (!_.get(data, 'hits.hits.length')) {
      throw new Error('ES查询获取失败！')
    }

    const hits = _.get(data, 'hits.hits', [])
    const firstHit = _.get(hits, '[0]._source')

    if (!firstHit) {
      throw new Error('查询结果为空')
    }

    // 安全获取类型
    const rawType = _.get(firstHit, 'type')
    const type = _.isNumber(rawType) ? rawType : safeParseInt(rawType, -1)

    if (type === -1) {
      throw new Error('无效的数据类型')
    }

    // 安全构建通用载荷
    const commonPayload = {
      total: _.get(data, 'hits.total.value', 0),
      rangeMoment: _.isArray(rangeMoment) ? rangeMoment : [],
      source: _.get(payload, 'source', ''),
      range: _.get(payload, 'range', 900),
      itemid: _.get(payload, 'itemid', ''),
      FirstOccurrence: _.get(payload, 'FirstOccurrence', ''),
      current: safeParseInt(_.get(payload, 'current'), 1) || safeParseInt(_.get(pagination, 'current'), 1)
    }

    // 展示曲线 0、3类型
    // if (type === 11 || type === 33) {
    if (type === 0 || type === 3) {
      // 安全提取图表数据
      const xAxisData = _.compact(hits.map(hit => _.get(hit, '_source.clock_time')))
      const seriesData = _.compact(hits.map(hit => {
        const value = _.get(hit, '_source.value')
        // 保留完整的小数值，不进行整数截断
        if (_.isNumber(value)) return value
        const numValue = Number(value)
        return _.isNaN(numValue) ? 0 : numValue
      }))

      console.log(firstHit, 'firstHit')
      const yAxisData = _.get(firstHit, 'source', '')

      return {
        ...commonPayload,
        xAxisData,
        yAxisData,
        chartObj: firstHit,
        seriesData,
        showChartOrTable: true
      }
    }

    // 处理表格 1、2、4类型
    // if (type === 3) {
    if (type === 1 || type === 2 || type === 4) {
      return {
        ...commonPayload,
        tableData: hits,
        showChartOrTable: false
      }
    }

    throw new Error(`无法展示，type类型为：${type}`)
  } catch (error) {
    console.error('处理查询结果失败:', error)
    throw error
  }
}

export default {
  namespace: 'performHost',

  state: {
    showChartOrTable: true,
    chartData: [],
    FirstOccurrence: undefined,
    source: '',
    range: 900,
    itemid: '',
    rangeMoment: [],
    useDirectTimeRange: false, // 标记是否使用RangePicker直接选择的时间范围
    // echarts 图形数据
    xAxisData: [],
    yAxisData: '',
    chartObj: {},
    seriesData: [],
    // table 数据
    chartPagination: DEFAULT_CHART_PAGINATION,
    tablePagination: DEFAULT_TABLE_PAGINATION,
    tableData: [],
    sorter: DEFAULT_SORTER,
    loading: false
  },

  effects: {
    *query({ payload }, { call, put, select }) {
      try {
        yield put({ type: 'showLoading' })

        // 安全获取当前状态
        const currentState = yield select((state) => _.get(state, 'performHost', {}))
        const chartPagination = _.get(currentState, 'chartPagination', DEFAULT_CHART_PAGINATION)
        const tablePagination = _.get(currentState, 'tablePagination', DEFAULT_TABLE_PAGINATION)
        const sorter = _.get(currentState, 'sorter', DEFAULT_SORTER)

        // 根据 showChartOrTable 决定使用哪个分页
        const isChart = _.get(currentState, 'showChartOrTable', true)
        const pagination = isChart ? chartPagination : tablePagination

        // 验证查询参数
        const errors = validateQueryParams(payload)
        if (errors.length > 0) {
          errors.forEach((error) => message.warning(error))
          return
        }

        // 处理时间戳
        const processedTimestamp = processTimestamp(_.get(payload, 'FirstOccurrence'))
        if (!processedTimestamp) {
          message.error('时间戳格式错误')
          return
        }

        let startTime
        let endTime
        let range
        let rangeMoment = []

        // 检查是否使用直接时间范围（从RangePicker选择）
        if (_.get(payload, 'useDirectTimeRange')) {
          // 直接使用用户选择的时间范围，确保精度一致
          startTime = _.get(payload, 'startTime')
          endTime = _.get(payload, 'endTime')
          range = Math.round((endTime - startTime) / 2) // 计算range用于查询

          // 直接使用原始选择的moment对象，确保时间精度完全一致
          const selectedRangeMoment = _.get(payload, 'selectedRangeMoment')
          if (_.isArray(selectedRangeMoment) && selectedRangeMoment.length === 2) {
            rangeMoment = selectedRangeMoment
          } else {
            // 备用方案：从时间戳创建moment对象
            try {
              rangeMoment = [moment(startTime * 1000), moment(endTime * 1000)]
            } catch (momentError) {
              console.warn('创建moment对象失败:', momentError)
              rangeMoment = []
            }
          }
        } else {
          // 传统方式：基于中心时间和范围计算（Select选择或初始加载）
          range = safeParseInt(_.get(payload, 'range'), 900)
          const timestampNum = safeParseInt(processedTimestamp)

          if (timestampNum <= 0) {
            message.error('无效的时间戳')
            return
          }

          startTime = timestampNum - range
          endTime = timestampNum + range

          // 生成基于告警时间的时间范围显示数据 - 安全处理
          try {
            rangeMoment = [moment(startTime * 1000), moment(endTime * 1000)]
          } catch (momentError) {
            console.warn('创建moment对象失败:', momentError)
            rangeMoment = []
          }
        }

        const processedPayload = {
          ...payload,
          FirstOccurrence: processedTimestamp,
          startTime,
          endTime,
          range
        }

        // 更新基本状态
        const updatePayload = {
          rangeMoment, // 保持rangeMoment的值，如果有updateRangeMoment标志则使用新的
          source: _.get(payload, 'source', ''),
          range,
          itemid: _.get(payload, 'itemid', ''),
          useDirectTimeRange: _.get(payload, 'useDirectTimeRange', false) // 保存时间范围模式
        }

        // 如果需要更新RangePicker的显示（从Select选择时）
        if (_.get(payload, 'updateRangeMoment')) {
          const newRangeMoment = _.get(payload, 'selectedRangeMoment')
          if (_.isArray(newRangeMoment) && newRangeMoment.length === 2) {
            updatePayload.rangeMoment = newRangeMoment
          }
        }

        // 只有在非直接时间范围模式下才更新FirstOccurrence（保持告警时间固定）
        if (!_.get(payload, 'useDirectTimeRange')) {
          updatePayload.FirstOccurrence = processedTimestamp
        } else {
          // 在直接时间范围模式下，保持原始的FirstOccurrence
          updatePayload.FirstOccurrence = _.get(currentState, 'FirstOccurrence', processedTimestamp)
        }

        yield put({
          type: 'updateBasicState',
          payload: updatePayload
        })

        // 构建查询参数
        const dslTemplate = configureHostPerfCurveDSLTemplate(peformanceCfg.queryHostPerformance, processedPayload, pagination, sorter)

        // 安全获取查询路径
        let queryPath
        try {
          queryPath = getPerfHostIndexName(processedPayload)
        } catch (pathError) {
          console.error('获取索引路径失败:', pathError)
          throw new Error('索引配置错误')
        }

        const queryParams = {
          es: dslTemplate,
          paths: queryPath
        }

        // 执行查询
        const data = yield call(query, queryParams)

        // 安全检查响应状态
        const status = _.get(data, 'status') || _.get(data, 'statusCode')
        const success = _.get(data, 'success')

        if (status === 200 || (status === 200 && success)) {
          const result = processQueryResult(
            data,
            processedPayload,
            pagination,
            rangeMoment
          )
          yield put({
            type: 'querySuccess',
            payload: result
          })
        } else {
          throw new Error(`查询失败，状态码: ${status}`)
        }
      } catch (error) {
        console.error('查询失败:', error)
        message.error(error.message || '查询失败')
        yield put({ type: 'hideLoading' })
      }
    },

    *handleChartPaginationChange({ payload }, { put, select }) {
      try {
        // 安全获取当前状态
        const currentState = yield select((state) => _.get(state, 'performHost', {}))

        // 更新图表分页状态 - 安全处理
        const currentPage = safeParseInt(_.get(payload, 'current'), 1)
        const pageSize = safeParseInt(_.get(payload, 'pageSize'), 100)

        yield put({
          type: 'updateChartPagination',
          payload: {
            current: currentPage,
            pageSize
          }
        })

        // 重新执行查询 - 安全提取参数
        const queryPayload = {
          source: _.get(currentState, 'source', ''),
          itemid: _.get(currentState, 'itemid', ''),
          FirstOccurrence: _.get(currentState, 'FirstOccurrence', ''),
          range: _.get(currentState, 'range', 900),
          current: currentPage
        }

        // 如果有rangeMoment并且正在使用直接时间范围（RangePicker选择），需要保持这个模式
        const rangeMoment = _.get(currentState, 'rangeMoment', [])
        if (_.isArray(rangeMoment) && rangeMoment.length === 2 && _.get(currentState, 'useDirectTimeRange')) {
          // 保持RangePicker选择的时间范围
          queryPayload.useDirectTimeRange = true
          queryPayload.startTime = moment(rangeMoment[0]).unix()
          queryPayload.endTime = moment(rangeMoment[1]).unix()
          queryPayload.selectedRangeMoment = rangeMoment
        }

        yield put({
          type: 'query',
          payload: queryPayload
        })
      } catch (error) {
        console.error('图表分页处理失败:', error)
        message.error('图表分页处理失败')
      }
    },

    *handleTablePaginationChange({ payload }, { put, select }) {
      try {
        // 安全获取当前状态
        const currentState = yield select((state) => _.get(state, 'performHost', {}))

        // 更新表格分页状态 - 安全处理
        const currentPage = safeParseInt(_.get(payload, 'current'), 1)
        const pageSize = safeParseInt(_.get(payload, 'pageSize'), 10)

        yield put({
          type: 'updateTablePagination',
          payload: {
            current: currentPage,
            pageSize
          }
        })

        // 更新排序状态 - 安全处理
        const sortField = _.get(payload, 'sortField')
        if (sortField) {
          const sortOrder = _.get(payload, 'sortOrder')
          let order = 'asc'
          if (sortOrder === 'ascend') {
            order = 'asc'
          } else if (sortOrder === 'descend') {
            order = 'desc'
          }

          yield put({
            type: 'updateSorter',
            payload: {
              field: sortField,
              order
            }
          })
        }

        // 重新执行查询 - 安全提取参数
        const queryPayload = {
          source: _.get(currentState, 'source', ''),
          itemid: _.get(currentState, 'itemid', ''),
          FirstOccurrence: _.get(currentState, 'FirstOccurrence', ''),
          range: _.get(currentState, 'range', 900),
          current: currentPage
        }

        yield put({
          type: 'query',
          payload: queryPayload
        })
      } catch (error) {
        console.error('表格分页处理失败:', error)
        message.error('表格分页处理失败')
      }
    }
  },

  reducers: {
    updateBasicState(state, { payload }) {
      return {
        ...state,
        ..._.pick(payload, [
          'rangeMoment', 'FirstOccurrence', 'source', 'range', 'itemid', 'useDirectTimeRange'
        ])
      }
    },

    querySuccess(state, { payload }) {
      const isChart = _.get(payload, 'showChartOrTable', true)
      const paginationKey = isChart ? 'chartPagination' : 'tablePagination'

      return {
        ...state,
        loading: false,
        ..._.pick(payload, [
          'xAxisData', 'yAxisData', 'chartObj', 'seriesData', 'showChartOrTable',
          'tableData', 'total', 'current', 'rangeMoment'
        ]),
        [paginationKey]: {
          ...state[paginationKey],
          total: safeParseInt(_.get(payload, 'total'), 0),
          current: safeParseInt(_.get(payload, 'current'), 1) || state[paginationKey].current
        }
      }
    },

    updateChartPagination(state, { payload }) {
      return {
        ...state,
        chartPagination: {
          ...state.chartPagination,
          ..._.pick(payload, ['current', 'pageSize'])
        }
      }
    },

    updateTablePagination(state, { payload }) {
      return {
        ...state,
        tablePagination: {
          ...state.tablePagination,
          ..._.pick(payload, ['current', 'pageSize'])
        }
      }
    },

    updateSorter(state, { payload }) {
      return {
        ...state,
        sorter: {
          ...state.sorter,
          ..._.pick(payload, ['field', 'order'])
        }
      }
    },

    showLoading(state) {
      return {
        ...state,
        loading: true
      }
    },

    hideLoading(state) {
      return {
        ...state,
        loading: false
      }
    }
  },

  subscriptions: {
    setup({ dispatch, history }) {
      return history.listen((location) => {
        try {
          // 安全解析查询参数
          if (location.pathname === '/performHost') {
            const queryParams = queryString.parse(_.get(location, 'search', ''))

            // 只在有有效参数时才触发查询
            if (_.get(queryParams, 'FirstOccurrence') &&
                _.get(queryParams, 'itemid')) {
              dispatch({
                type: 'query',
                payload: queryParams
              })
            }
          }
        } catch (error) {
          console.error('路由监听错误:', error)
          message.error('路由监听错误')
        }
      })
    }
  }
}
