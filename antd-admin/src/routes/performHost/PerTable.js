import React, { useState, useEffect, useCallback } from 'react'
import { Table } from 'antd'
import PropTypes from 'prop-types'
import moment from 'moment'

moment.locale('zh-cn')

const PerTable = ({
  dataSource = [],
  pagination = {},
  onChange = () => {},
  currentData = () => {},
  rowKey = 'id',
  defaultSortField = null,
  defaultSortOrder = 'ascend',
  columns = [],
  dateFormats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-M-DD HH:mm:ss',
    'YYYY-MM-D HH:mm:ss',
    'YYYY-M-D HH:mm:ss'
  ],
  ...restProps
}) => {
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState(defaultSortField)
  const [sortOrder, setSortOrder] = useState(defaultSortOrder)
  const [prevDataSource, setPrevDataSource] = useState(dataSource)

  // 安全获取字段值
  const getFieldValue = useCallback((item, field) => {
    if (item._source && item._source[field] !== undefined) {
      return item._source[field]
    }

    if (item[field] !== undefined) {
      return item[field]
    }
    return null
  }, [])

  // 日期解析处理
  const parseDate = useCallback((value) => {
    // 如果是数字，可能是时间戳
    if (typeof value === 'number') {
      return moment(value)
    }

    // 尝试所有支持的格式
    for (const format of dateFormats) {
      const parsed = moment(value, format, true) // 严格模式
      if (parsed.isValid()) {
        return parsed
      }
    }
    // 默认宽松解析
    return moment(value)
  }, [dateFormats])

  // 获取排序后的数据
  const getSortedData = useCallback(() => {
    if (!Array.isArray(dataSource)) {
      return []
    }

    // 如果没有排序字段或排序方向，返回原始数据
    if (!sortField || !sortOrder) {
      return [...dataSource]
    }

    return [...dataSource].sort((a, b) => {
      const valueA = getFieldValue(a, sortField)
      const valueB = getFieldValue(b, sortField)

      // 处理空值
      if (valueA == null && valueB == null) return 0
      if (valueA == null) return sortOrder === 'ascend' ? 1 : -1
      if (valueB == null) return sortOrder === 'ascend' ? -1 : 1

      // 数字类型排序
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortOrder === 'ascend' ? valueA - valueB : valueB - valueA
      }

      try {
        // 日期类型排序
        const momentA = parseDate(valueA)
        const momentB = parseDate(valueB)
        if (momentA.isValid() && momentB.isValid()) {
          // 精确到分钟的时间戳
          const timeA = momentA.startOf('minute').valueOf()
          const timeB = momentB.startOf('minute').valueOf()

          return sortOrder === 'ascend' ? timeA - timeB : timeB - timeA
        }
      } catch (error) {
        console.log('日期解析错误：', error)
      }

      // 字符串类型排序
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortOrder === 'ascend'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA)
      }

      // 默认排序
      return sortOrder === 'ascend'
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA))
    })
  }, [dataSource, sortField, sortOrder, getFieldValue, parseDate])

  // 获取当前页数据
  const getCurrentPageData = useCallback(() => {
    const sortedData = getSortedData()
    const start = (current - 1) * pageSize
    const end = start + pageSize
    return sortedData.slice(start, end)
  }, [current, pageSize, getSortedData])

  // 更新当前页数据
  const updateCurrentData = useCallback(() => {
    currentData(getCurrentPageData())
  }, [currentData, getCurrentPageData])

  // 处理分页变化和排序状态切换
  const handleTableChange = useCallback((paginationParam, filters, sorter) => {
    // 处理排序状态切换逻辑
    let newSortField = sortField
    let newSortOrder = sortOrder

    if (sorter && sorter.field) {
      if (sorter.field !== sortField) {
        newSortField = sorter.field
        newSortOrder = 'ascend'
      } else {
        newSortOrder = sortOrder === 'ascend' ? 'descend' : 'ascend'
      }
    } else {
      // 取消排序
      newSortField = null
      newSortOrder = null
    }

    // 更新状态：分页和排序
    setCurrent(paginationParam.current || current)
    setPageSize(paginationParam.pageSize || pageSize)
    setSortField(newSortField)
    setSortOrder(newSortOrder)

    if (onChange) {
      // 调用父组件的 onChange 回调
      onChange(paginationParam, filters, {
        field: newSortField,
        order: newSortOrder
      })
    }
  }, [sortField, sortOrder, current, pageSize, onChange])

  // 数据源变化时重置到第一页
  useEffect(() => {
    if (dataSource !== prevDataSource && current !== 1) {
      setCurrent(1)
    }
    setPrevDataSource(dataSource)
  }, [dataSource, prevDataSource, current])

  // 默认排序初始化
  useEffect(() => {
    if (defaultSortField) {
      updateCurrentData()
    }
  }, [defaultSortField, updateCurrentData])

  // 分页或排序变化时更新当前页数据
  useEffect(() => {
    updateCurrentData()
  }, [updateCurrentData])

  const total = Array.isArray(dataSource) ? dataSource.length : 0

  // 分页配置
  const paginationConfig = {
    current,
    pageSize,
    total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (totalCount) => `共 ${totalCount} 条`,
    hideOnSinglePage: false, // 强制显示分页
    ...pagination, // 合并外部传入的配置
    pageSizeOptions: pagination.pageSizeOptions || ['10', '20', '30', '40', '50'],
  }

  // 获取当前页数据
  const currentPageData = getCurrentPageData()

  // 确保每条数据都有key
  const dataWithKeys = currentPageData.map((item, index) => {
    const keyValue =
      typeof rowKey === 'function'
        ? rowKey(item)
        : item[rowKey] || `row-${index}`
    return { ...item, key: keyValue }
  })

  // 处理列配置
  const processedColumns = columns.map((col) => {
    if (col.sorter && col.dataIndex === sortField) {
      return {
        ...col,
        sortOrder
      }
    }
    return col
  })

  return (
    <div>
      <Table
        {...restProps}
        scroll={{ y: 740 }}
        columns={processedColumns}
        dataSource={dataWithKeys}
        pagination={paginationConfig}
        onChange={handleTableChange}
        style={{ maxHeight: '85vh' }}
      />
    </div>
  )
}

PerTable.propTypes = {
  dataSource: PropTypes.array,
  pagination: PropTypes.object,
  onChange: PropTypes.func,
  currentData: PropTypes.func,
  rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  defaultSortField: PropTypes.string,
  defaultSortOrder: PropTypes.oneOf(['ascend', 'descend']),
  columns: PropTypes.array,
  dateFormats: PropTypes.array
}

export default PerTable
