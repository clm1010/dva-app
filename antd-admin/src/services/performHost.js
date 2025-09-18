import { request, config } from 'utils'

const { api } = config
const { es } = api

export async function query(params) {
  // params 包含 { paths: '/nt_zabbix_performance/_search/', es: dslTemplate }
  const { paths, es: dslQuery } = params

  // 构建完整的 Elasticsearch URL
  const esUrl = `${es}${paths}`

  return request({
    url: esUrl,
    method: 'post',
    data: dslQuery
  })
}
