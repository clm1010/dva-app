import React, { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Card, Row, Col, Descriptions, Button, List, Spin } from 'antd'
import { connect } from 'dva'
import { routerRedux } from 'dva/router'
import LineChart1 from '../LineChart1'
import LineChartSum from '../LineChartSum'

const ChdDetail = ({ chddetailData, loading, dispatch }) => {
  const {
    list = [],
    roleInfo = {},
    hostipDetails = {},
    hostipPagination = {}
  } = chddetailData || {}

  const {
    role = '未知应用',
    vendor = '未知',
    device = '未知设备',
    timeRange = {}
  } = roleInfo || {}

  const formatTimeRange = useMemo(() => {
    if (timeRange && timeRange.startTimeStr && timeRange.endTimeStr) {
      return `${timeRange.startTimeStr} 至 ${timeRange.endTimeStr}`
    }
    if (timeRange && timeRange.startTime && timeRange.endTime) {
      const startDate = new Date(timeRange.startTime * 1000)
      const endDate = new Date(timeRange.endTime * 1000)
      return `${startDate.toLocaleString('zh-CN')} 至 ${endDate.toLocaleString('zh-CN')}`
    }
    return '默认时间范围（最近6小时）'
  }, [timeRange])

  const isLoading = Boolean(loading && loading.effects && loading.effects['chddetail/query'])

  const renderDeviceItem = useCallback(
    (item) => {
      if (!item || !item.hostip) return null

      return (
        <List.Item key={item.hostip}>
          <Card
            title={`设备IP: ${item.hostip}`}
            size='small'
            style={{ marginBottom: '16px' }}
          >
            <div style={{ height: '480px', marginBottom: '80px' }}>
              <LineChart1
                data={hostipDetails[item.hostip] || item.chartData}
                dispatch={dispatch}
                pagination={hostipPagination[item.hostip]}
                hostip={item.hostip}
                appcode={roleInfo.role}
                startTime={roleInfo.timeRange && roleInfo.timeRange.startTime}
                endTime={roleInfo.timeRange && roleInfo.timeRange.endTime}
              />
            </div>
          </Card>
        </List.Item>
      )
    },
    [hostipDetails, hostipPagination, roleInfo, dispatch]
  )

  const hasValidData = Array.isArray(list) && list.length > 0

  return (
    <div style={{ padding: '24px' }}>
      <Row style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <h2>角色详情 - {role}</h2>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Button
            type='primary'
            onClick={() => {
              dispatch({
                type: 'qps/setFromChdDetail',
                payload: true
              })
              dispatch(routerRedux.push({
                pathname: '/qps',
                state: { fromChdDetail: true }
              }))
            }}
          >
            返回QPS列表
          </Button>
        </Col>
      </Row>

      <Card title='角色基本信息' style={{ marginBottom: '24px' }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label='角色/应用名称'>{role}</Descriptions.Item>
          <Descriptions.Item label='厂商'>{vendor}</Descriptions.Item>
          <Descriptions.Item label='设备名称'>{device}</Descriptions.Item>
          <Descriptions.Item label='设备IP数量'>
            {hasValidData ? list.length : 0}
          </Descriptions.Item>
          <Descriptions.Item label='查询时间范围' span={2}>
            {formatTimeRange}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title='所有设备IP的QPS曲线图' style={{ marginBottom: '24px' }}>
        <Spin spinning={isLoading}>
          {hasValidData ? (
            <List
              grid={{ gutter: 16, column: 1 }}
              dataSource={list}
              renderItem={renderDeviceItem}
              locale={{ emptyText: '暂无数据' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              暂无设备IP数据
            </div>
          )}
        </Spin>
      </Card>

      <Card title='所有设备IP的QPS汇总曲线图 - 每个IP独立显示' style={{ marginBottom: '24px' }}>
        <Spin spinning={isLoading}>
          {hasValidData ? (
            <div>
              <LineChartSum
                deviceList={list}
                hostipDetails={hostipDetails}
              />
              <div style={{ padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '14px', color: '#666', marginTop: '15px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>汇总说明：</strong>
                </div>
                <div>
                  • 此图表展示了每个设备IP的独立QPS曲线，每条线代表一个设备
                  <br />• 数据来源：{list.length} 个设备IP的QPS数据
                  <br />• 时间范围：{formatTimeRange}
                  <br />• 每个设备使用不同颜色区分，支持图例点击切换显示
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              暂无汇总数据
            </div>
          )}
        </Spin>
      </Card>
    </div>
  )
}

ChdDetail.propTypes = {
  chddetailData: PropTypes.object,
  loading: PropTypes.object,
  dispatch: PropTypes.func.isRequired
}

export default connect(({ chddetail, loading }) => ({
  chddetailData: chddetail,
  loading
}))(ChdDetail)
