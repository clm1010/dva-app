/* eslint-disable camelcase */
import React from 'react'
import { Row } from 'antd'
import { connect } from 'dva'
import PropTypes from 'prop-types'
import _ from 'lodash'
import SearchZone from './SearchZone'
import PerChart from './PerChart'
import PerList from './PerList'

const customPanelStyle = {
  background: '#fff',
  borderRadius: 4,
  border: 0,
  borderBottom: '1px solid #E9E9E9',
  padding: 12,
  fontWeight: 'bold',
  fontSize: 14
}

// 默认的performHost状态
const DEFAULT_PERFORM_HOST_STATE = {
  FirstOccurrence: '',
  rangeMoment: [],
  source: '',
  range: 900,
  ip_addr: '',
  itemid: '',
  tableData: [],
  chartPagination: { current: 1, pageSize: 100, total: 0 },
  tablePagination: { current: 1, pageSize: 10, total: 0 },
  sorter: {},
  xAxisData: [],
  yAxisData: '',
  chartObj: {},
  seriesData: [],
  showChartOrTable: true
}

const PerformHost = ({ dispatch, loading, performHost }) => {
  // 使用lodash安全地合并默认状态
  const safePerformHost = _.merge({}, DEFAULT_PERFORM_HOST_STATE, performHost)

  const {
    FirstOccurrence,
    rangeMoment,
    source,
    range,
    ip_addr,
    itemid,
    tableData,
    chartPagination,
    tablePagination,
    sorter,
    xAxisData,
    yAxisData,
    chartObj,
    seriesData,
    showChartOrTable
  } = safePerformHost

  // 安全的loading状态检查
  const isLoading = _.get(loading, 'models.performHost', false)

  // 安全的分页对象处理
  const safeChartPagination = _.merge(
    { current: 1, pageSize: 100, total: 0 },
    _.isObject(chartPagination) ? chartPagination : {}
  )

  const safeTablePagination = _.merge(
    { current: 1, pageSize: 10, total: 0 },
    _.isObject(tablePagination) ? tablePagination : {}
  )

  const zoneProps = {
    dispatch,
    FirstOccurrence,
    rangeMoment: _.isArray(rangeMoment) ? rangeMoment : [],
    source: source || '',
    range: _.isNumber(range) ? range : 900,
    ip_addr: ip_addr || '',
    itemid: itemid || '',
    pagination: safeChartPagination // SearchZone使用图表分页
  }

  // 表格属性安全处理
  const perListProps = {
    dispatch,
    tableData: _.isArray(tableData) ? tableData : [],
    pagination: safeTablePagination,
    sorter: _.isObject(sorter) ? sorter : {}
  }

  // 图表属性安全处理
  const chartProps = {
    dispatch,
    xAxisData: _.isArray(xAxisData) ? xAxisData : [],
    yAxisData: _.isString(yAxisData) ? yAxisData : '',
    chartObj: _.isObject(chartObj) ? chartObj : {},
    seriesData: _.isArray(seriesData) ? seriesData : [],
    loading: isLoading,
    pagination: safeChartPagination,
    source: source || '',
    ip_addr: ip_addr || '',
    itemid: itemid || '',
    FirstOccurrence: FirstOccurrence || '',
    range: _.isNumber(range) ? range : 900,
    rangeMoment: _.isArray(rangeMoment) ? rangeMoment : []
  }

  return (
    <div>
      <Row style={customPanelStyle}>
        <SearchZone {...zoneProps} />
      </Row>
      <Row style={customPanelStyle}>
        {showChartOrTable ? (
          /* 加入图表的位置 */
          <PerChart {...chartProps} />
        ) : (
          /* 加入表格的位置 */
          <div style={{ background: '#FFF', padding: 24 }}>
            <PerList {...perListProps} />
          </div>
        )}
      </Row>
    </div>
  )
}

PerformHost.propTypes = {
  dispatch: PropTypes.func.isRequired,
  loading: PropTypes.shape({
    models: PropTypes.shape({
      performHost: PropTypes.bool
    })
  }),
  performHost: PropTypes.shape({
    FirstOccurrence: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rangeMoment: PropTypes.array,
    source: PropTypes.string,
    range: PropTypes.number,
    ip_addr: PropTypes.string,
    itemid: PropTypes.string,
    tableData: PropTypes.array,
    chartPagination: PropTypes.shape({
      current: PropTypes.number,
      pageSize: PropTypes.number,
      total: PropTypes.number
    }),
    tablePagination: PropTypes.shape({
      current: PropTypes.number,
      pageSize: PropTypes.number,
      total: PropTypes.number
    }),
    sorter: PropTypes.object,
    xAxisData: PropTypes.array,
    yAxisData: PropTypes.string,
    chartObj: PropTypes.object,
    seriesData: PropTypes.array,
    showChartOrTable: PropTypes.bool
  })
}

PerformHost.defaultProps = {
  loading: { models: { performHost: false } },
  performHost: DEFAULT_PERFORM_HOST_STATE
}

export default connect(({ performHost, loading }) => ({
  performHost: performHost || {},
  loading: loading || { models: { performHost: false } }
}))(PerformHost)
