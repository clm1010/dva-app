import { request, config } from 'utils'

const { api } = config
const { es } = api

/**
 * 查询角色详情QPS数据
 * @param {Object} params - 查询参数
 * @param {Object} params.es - ES DSL查询语句
 * @param {string} params.paths - ES查询路径
 * @returns {Promise} 查询结果
 */
export async function queryRoleDetailService(params) {
  // params 包含 { paths: '/u2performance_for_test/_search/', es: dslTemplate }
  const { paths, es: dslQuery } = params

  // 构建完整的 Elasticsearch URL
  const esUrl = `${es}${paths}`

  return request({
    url: esUrl,
    method: 'post',
    data: dslQuery
  })
}

/**
 * 查询单个设备IP的详细数据（支持分页）
 * @param {Object} params - 查询参数
 * @param {Object} params.es - ES DSL查询语句
 * @param {string} params.paths - ES查询路径
 * @returns {Promise} 查询结果
 */
export async function queryHostipDetailService(params) {
  // params 包含 { paths: '/u2performance_for_test/_search/', es: dslTemplate }
  const { paths, es: dslQuery } = params

  // 构建完整的 Elasticsearch URL
  const esUrl = `${es}${paths}`

  return request({
    url: esUrl,
    method: 'post',
    data: dslQuery
  })
}
