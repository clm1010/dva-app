// 功能工具函数集合
import moment from 'moment'

/**
 * 将时间戳转换为日期字符串
 * @param {number|string} timestamp - 时间戳（秒或毫秒）
 * @returns {string} 格式化的日期字符串
 */
export function timestampToDate(timestamp) {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp
  // 如果是秒级时间戳，转换为毫秒
  const milliseconds = ts.toString().length <= 10 ? ts * 1000 : ts

  // 使用 moment 格式化日期
  return moment(milliseconds).format('YYYY-MM-DD')
}

/**
 * 根据时间范围查找 Elasticsearch 索引
 * @param {number} start - 开始时间（毫秒）
 * @param {number} end - 结束时间（毫秒）
 * @param {string} indexName - 索引前缀
 * @param {string} indexType - 时间周期（day、month等）
 * @param {string} ip - 主机IP
 * @returns {string} 索引路径
 */
export function ESFindIndex(start, end, indexName, indexType, ip) {
  switch (indexType) {
    case 'day': {
      const arry = []
      const startMoment = moment(start).startOf('day')
      const endMoment = moment(end).startOf('day')
      const currentMoment = startMoment.clone()

      // 基于日期循环，使用 moment 的 isSameOrBefore 判断
      while (currentMoment.isSameOrBefore(endMoment, 'day')) {
        // 使用 moment 格式化日期
        const dateStr = currentMoment.format('YYYY.MM.DD')
        arry.push(`${indexName}${dateStr}`)

        // 增加一天
        currentMoment.add(1, 'day')
      }

      return `${ip}/${arry.join(',')}/_search/`
    }
    case 'month': {
      const monthSet = new Set()
      const startMoment = moment(start).startOf('month')
      const endMoment = moment(end).startOf('month')
      const currentMoment = startMoment.clone()

      // 基于月份循环，使用 moment 的 isSameOrBefore 判断
      while (currentMoment.isSameOrBefore(endMoment, 'month')) {
        // 使用 moment 格式化月份
        const monthStr = currentMoment.format('YYYY.MM')
        monthSet.add(`${indexName}${monthStr}`)

        // 增加一个月
        currentMoment.add(1, 'month')
      }

      return `${ip}/${Array.from(monthSet).join(',')}/_search/`
    }
    case 'years': {
      const yearSet = new Set()
      const startYear = moment(start).year()
      const endYear = moment(end).year()

      // 基于年份循环
      for (let year = startYear; year <= endYear; year++) {
        yearSet.add(`${indexName}${year}.*`)
      }

      return `${ip}/${Array.from(yearSet).join(',')}/_search/`
    }
    default:
      return `${ip}/${indexName}*/_search/`
  }
}

/**
 * 安全的整数解析
 * @param {any} value - 需要解析的值
 * @param {number} defaultValue - 默认值
 * @returns {number} 解析后的整数
 */
export function safeParseInt(value, defaultValue = 0) {
  if (typeof value === 'number') return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}
