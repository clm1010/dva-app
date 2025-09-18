import React, { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Table, Row, Col } from 'antd'

const PerList = ({ dispatch, loading, tableData, pagination, sorter }) => {
  // 获取排序状态
  const getSortOrder = useCallback((field) => {
    if (sorter && sorter.field === field) {
      return sorter.order === 'asc' ? 'ascend' : 'descend'
    }
    return null
  }, [sorter])

  // 分页和排序变化处理
  const handleTableChange = useCallback((paginationConfig, filters, sorterConfig) => {
    const sortField = sorterConfig.field
    // 更新分页状态
    dispatch({
      type: 'performHost/handleTablePaginationChange',
      payload: {
        current: paginationConfig.current,
        pageSize: paginationConfig.pageSize,
        sortField,
        sortOrder: sorterConfig.order
      }
    })
  }, [dispatch])

  // 表格columns
  const columns = useMemo(() => [
    {
      title: '监控项名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
      width: '30%',
      sorter: true,
      sortOrder: getSortOrder('name'),
      render: (text, record) => {
        return <span>{record._source && record._source.name}</span>
      },
    },
    {
      title: '时间',
      dataIndex: 'clock_time',
      key: 'clock_time',
      align: 'center',
      width: '30%',
      sorter: true,
      sortOrder: getSortOrder('clock_time'),
      defaultSortOrder: 'ascend',
      render: (text, record) => {
        return <span>{record._source && record._source.clock_time}</span>
      },
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      align: 'center',
      sorter: true,
      sortOrder: getSortOrder('value'),
      render: (text, record) => {
        return <span>{record._source && record._source.value}</span>
      },
    },
  ], [getSortOrder])

  const processedList = useMemo(() => {
    return tableData && tableData.map((item, index) => ({
      ...item,
      key: item._id || `item-${index}-${Date.now()}`
    })) || []
  }, [tableData])

  const paginationConfig = useMemo(() => ({
    ...pagination,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: total => `共${total}条`,
    pageSizeOptions: ['10', '20', '30', '40', '50', '60', '100', '200']
  }), [pagination])

  return (
    <Row gutter={24}>
      <Col xl={{ span: 24 }} md={{ span: 24 }} sm={{ span: 24 }}>
        <Table
          scroll={{ y: 740 }}
          bordered
          columns={columns}
          dataSource={processedList}
          loading={loading}
          onChange={handleTableChange}
          pagination={paginationConfig}
          rowKey="key"
          size="small"
        />
      </Col>
    </Row>
  )
}

PerList.propTypes = {
  dispatch: PropTypes.func,
  loading: PropTypes.bool,
  tableData: PropTypes.array,
  pagination: PropTypes.object,
  sorter: PropTypes.object
}

export default PerList
