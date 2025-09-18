import _ from 'lodash'
import { safeParseInt } from './FunctionTool'

// DSL查询配置方法
const ipAddressStr = '10.225.66.156,10.1.67.68,10.1.60.62,192.168.1.2'
/**

- 配置QPS查询DSL模板
- @param {Object} dslTemplate - DSL模板
- @param {number} startTime - 开始时间戳
- @param {number} endTime - 结束时间戳
- @returns {Object} 配置后的DSL模板
  */
export const configureQpsDSLTemplate = (dslTemplate, startTime, endTime) => {
  const template = _.cloneDeep(dslTemplate)

  if (!_.has(template, 'query.bool.must[0].range.clock')) {
    throw new Error('DSL模板结构错误: 缺少时间范围字段')
  }

  _.set(template, 'query.bool.must[0].range.clock.gte', startTime)
  _.set(template, 'query.bool.must[0].range.clock.lte', endTime)
  _.set(template, 'query.bool.must[1].term.kpiname', '每秒DNS查询数')
  _.set(template, 'query.bool.must[2].terms.hostip', ipAddressStr.split(','))

  // 配置分页参数 - 对于聚合查询，不在根级别设置分页
  // 聚合分页将在聚合配置中处理

  const sourceFields = [
    'agent',
    'appname',
    'appcode',
    '@version',
    'branchnamecn',
    'hostname',
    'hostip',
    'bizarea',
    'vendor',
    'component',
    'clock',
    'value',
    '@timestamp'
  ]

  // 安全地配置聚合字段
  try {
    // 配置设备分组聚合
    if (_.has(template, 'aggs.group_by_device.terms')) {
      _.set(template, 'aggs.group_by_device.terms.field', 'appcode')
      // 设置足够大的size以获取所有设备，实际分页在前端处理
      _.set(template, 'aggs.group_by_device.terms.size', 10000)
    }

    // 配置最新信息聚合
    const latestInfoPath = 'aggs.group_by_device.aggs.latest_info.top_hits._source'
    if (_.has(template, latestInfoPath)) {
      _.set(template, `${latestInfoPath}.include`, sourceFields)
    }

    // 配置hostip值聚合
    if (_.has(template, 'aggs.group_by_device.aggs.hostip_values.terms')) {
      _.set(template, 'aggs.group_by_device.aggs.hostip_values.terms.field', 'hostip')
      _.set(template, 'aggs.group_by_device.aggs.hostip_values.terms.size', 1000)
    }

    // 配置所有值聚合
    const allValuesPath = 'aggs.group_by_device.aggs.hostip_values.aggs.all_values.top_hits'
    if (_.has(template, `${allValuesPath}._source`)) {
      _.set(template, `${allValuesPath}._source.include`, sourceFields)
      _.set(template, `${allValuesPath}.size`, 100)
    }

    // 配置设备计数聚合
    if (_.has(template, 'aggs.group_by_device.aggs.device_count.cardinality')) {
      _.set(template, 'aggs.group_by_device.aggs.device_count.cardinality.field', 'hostip')
    }
  } catch (error) {
    console.warn('配置DSL模板聚合字段时出错:', error)
  }

  return template
}

/**

- 配置角色详情DSL模板
- @param {Object} dslTemplate - DSL模板
- @param {number} startTime - 开始时间戳
- @param {number} endTime - 结束时间戳
- @param {string} appcode - 应用代码（可选）
- @returns {Object} 配置后的DSL模板
  */
export const configureRoleDetailDSLTemplate = (
  dslTemplate,
  startTime,
  endTime,
  appcode = null
) => {
  const template = _.cloneDeep(dslTemplate)

  if (!_.has(template, 'query.bool.must[0].range.clock')) {
    throw new Error('DSL模板结构错误: 缺少时间范围字段')
  }

  _.set(template, 'query.bool.must[0].range.clock.gte', startTime)
  _.set(template, 'query.bool.must[0].range.clock.lte', endTime)

  // 如果提供了appcode，设置应用代码查询条件
  if (appcode && _.has(template, 'query.bool.must[1].term')) {
    _.set(template, 'query.bool.must[1].term.appcode', appcode)
  }

  _.set(template, 'query.bool.must[2].term.kpiname', '每秒DNS查询数')

  const sourceFields = [
    'agent',
    'appname',
    'appcode',
    '@version',
    'branchnamecn',
    'hostname',
    'hostip',
    'bizarea',
    'vendor',
    'component',
    'clock',
    'value',
    '@timestamp'
  ]

  // 安全地配置聚合字段
  try {
    const latestInfoPath =
      'aggs.group_by_hostip.aggs.latest_info.top_hits._source'
    const timeSeriesPath =
      'aggs.group_by_hostip.aggs.time_series.top_hits._source'

    if (_.has(template, latestInfoPath)) {
      _.set(template, `${latestInfoPath}.include`, sourceFields)
    }
    if (_.has(template, timeSeriesPath)) {
      _.set(template, `${timeSeriesPath}.include`, sourceFields)
    }
  } catch (aggError) {
    console.warn('配置DSL模板聚合字段时出错:', aggError)
  }

  return template
}

/**

- 配置设备IP详情DSL模板
- @param {Object} dslTemplate - DSL模板
- @param {number} startTime - 开始时间戳
- @param {number} endTime - 结束时间戳
- @param {string} hostip - 设备IP
- @param {string} appcode - 应用代码
- @returns {Object} 配置后的DSL模板
  */
export const configureHostipDetailDSLTemplate = (
  dslTemplate,
  startTime,
  endTime,
  hostip,
  appcode
) => {
  const template = _.cloneDeep(dslTemplate)

  if (!_.has(template, 'query.bool.must[0].range.clock')) {
    throw new Error('设备IP详情DSL模板结构错误: 缺少时间范围字段')
  }

  _.set(template, 'query.bool.must[0].range.clock.gte', startTime)
  _.set(template, 'query.bool.must[0].range.clock.lte', endTime)
  _.set(template, 'query.bool.must[1].term.hostip', hostip)
  _.set(template, 'query.bool.must[2].term.appcode', appcode)
  _.set(template, 'query.bool.must[3].term.kpiname', '每秒DNS查询数')

  return template
}

/**
 * 配置主机性能曲线DSL模板
 * @param {Object} dslTemplate - DSL模板
 * @param {Object} payload - 查询参数
 * @param {Object} pagination - 分页参数
 * @param {Object} sorter - 排序参数
 * @returns {Object} 配置后的DSL模板
 */
export const configureHostPerfCurveDSLTemplate = (dslTemplate, payload, pagination, sorter) => {
  try {
    // 安全克隆配置
    if (!dslTemplate) {
      throw new Error('缺少查询配置模板')
    }

    const template = _.cloneDeep(dslTemplate)

    // 确保必要的结构存在
    if (!_.get(template, 'query.bool.must')) {
      _.set(template, 'query.bool.must', [])
    }

    template.sort = []

    // 添加查询条件 - 安全提取
    const startTime = _.get(payload, 'startTime')
    const endTime = _.get(payload, 'endTime')
    const source = _.get(payload, 'source', '')
    // eslint-disable-next-line camelcase
    const ip_addr = _.get(payload, 'ip_addr', '')
    const itemid = _.get(payload, 'itemid', '')

    // 时间范围查询条件
    if (process.env.NODE_ENV === 'production') {
      if (_.isNumber(startTime) && _.isNumber(endTime)) {
        template.query.bool.must.push({
          range: { clock: { gte: startTime * 1000, lte: endTime * 1000 } }
        })
      }
    } else {
      // 开发环境使用固定时间范围
      template.query.bool.must.push({
        range: { clock: { gte: 1733904097000, lte: 1747648800000 } }
      })
    }

    // 其他查询条件 - 确保值存在
    if (source) {
      template.query.bool.must.push({ term: { source } })
    }
    // eslint-disable-next-line camelcase
    if (ip_addr) {
      // eslint-disable-next-line camelcase
      template.query.bool.must.push({ term: { ip_addr } })
    }
    if (itemid) {
      template.query.bool.must.push({ term: { itemid } })
    }

    // 安全的排序条件处理
    const safeField = _.get(sorter, 'field')
    const safeOrder = _.get(sorter, 'order')

    if (safeField && safeOrder) {
      template.sort.push({
        [safeField]: { order: safeOrder }
      })
    } else {
      template.sort.push({ clock_time: { order: 'asc' } })
    }

    // 安全的分页参数处理
    const currentPage = safeParseInt(_.get(payload, 'current'), 1) || safeParseInt(_.get(pagination, 'current'), 1)
    const pageSize = safeParseInt(_.get(pagination, 'pageSize'), 10)

    template.from = Math.max(0, (currentPage - 1) * pageSize)
    template.size = Math.max(1, pageSize)

    return template
  } catch (error) {
    console.error('构建DSL查询失败:', error)
    throw new Error(`查询构建失败: ${error.message}`)
  }
}
