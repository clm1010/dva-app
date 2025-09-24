import { getDictValue } from '../utils/clientSetting'
import { ESFindIndex } from '../utils/FunctionTool'

// PerfHostIndexName 获取查询路径
export const getPerfHostIndexName = (payload) => {
  if (process.env.NODE_ENV === 'production') {
    return ESFindIndex(
      payload.startTime * 1000,
      payload.endTime * 1000,
      getDictValue('performanceCurve', 'ntZabbixPerformance'),
      'day',
      ''
    )
  }
  return '/nt_zabbix_performance/_search/'
}

/**
 * @description 获取QPS索引名称
 * @param {Object} payload - 查询参数
 * @param {number} payload.startTime - 开始时间
 * @param {number} payload.endTime - 结束时间
 * @returns {string} 索引名称
 */
export const getPerfQpsIndexName = (payload) => {
  // if (process.env.NODE_ENV === 'production') {
  return ESFindIndex(
    payload.startTime * 1000,
    payload.endTime * 1000,
    // getDictValue('performanceCurve', 'u2performance'),
    // getDictValue('performanceCurve', 'u2performance'),
    'u2performance-',
    'day',
    ''
  )
  // }
  // return '/u2performance_for_test/_search/'
}
