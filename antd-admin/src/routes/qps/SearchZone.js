import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { Form, Button, DatePicker, message } from 'antd'
import moment from 'moment'
import 'moment/locale/zh-cn'

moment.locale('zh-cn')

const { RangePicker } = DatePicker

const SearchZone = ({
  selectedDateRange,
  handleDateRangeChange,
  handleSearch,
  handleReset,
  loading = false
}) => {
  const disabledDate = (current) => {
    return current && current > moment()
  }

  const disabledTime = (current) => {
    if (!current) return {}

    const now = moment()
    const currentMoment = moment.isMoment(current) ? current : moment(current)

    if (currentMoment.isSame(now, 'day')) {
      return {
        disabledHours: () => {
          const hours = []
          for (let i = now.hour() + 1; i < 24; i++) {
            hours.push(i)
          }
          return hours
        },
        disabledMinutes: (selectedHour) => {
          // 如果选择的是未来的小时，禁用所有分钟
          if (selectedHour > now.hour()) {
            const minutes = []
            for (let i = 0; i < 60; i++) {
              minutes.push(i)
            }
            return minutes
          }
          // 如果选择的是当前小时，禁用未来的分钟
          if (selectedHour === now.hour()) {
            const minutes = []
            for (let i = now.minute() + 1; i < 60; i++) {
              minutes.push(i)
            }
            return minutes
          }
          // 过去的小时，所有分钟都可以选择
          return []
        }
      }
    }
    return {}
  }

  const ranges = useMemo(() => {
    const now = moment()
    return {
      今天: [now.clone().startOf('day'), now.clone()]
    }
  }, [])

  const handleDateChange = (dates) => {
    if (dates && dates.length === 2) {
      const adjustedDates = [
        dates[0] ? dates[0].startOf('minute') : null,
        dates[1] ? dates[1].startOf('minute') : null
      ]

      // 在调整时间后进行验证，确保与 handleSearch 中的逻辑一致
      if (adjustedDates[0] && adjustedDates[1]) {
        if (adjustedDates[0].isAfter(adjustedDates[1])) {
          message.warning('开始时间不能晚于结束时间')
          return
        }

        if (adjustedDates[1].isAfter(moment())) {
          message.warning('结束时间不能是未来时间')
          return
        }
      }

      handleDateRangeChange(adjustedDates)
    } else {
      handleDateRangeChange(dates)
    }
  }

  const handleSearchClick = () => {
    if (!selectedDateRange || !selectedDateRange[0] || !selectedDateRange[1]) {
      message.warning('请先选择查询时间范围')
      return
    }

    if (selectedDateRange[0].isAfter(selectedDateRange[1])) {
      message.error('开始时间不能晚于结束时间')
      return
    }

    handleSearch()
  }

  const getTimeRangeDescription = () => {
    if (!selectedDateRange || !selectedDateRange[0] || !selectedDateRange[1]) {
      return null
    }

    const start = selectedDateRange[0]
    const end = selectedDateRange[1]
    const diffMinutes = end.diff(start, 'minutes')
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const remainingMinutes = diffMinutes % 60

    if (diffDays === 0) {
      if (diffHours === 0) {
        return `查询范围: ${diffMinutes}分钟`
      }
      if (remainingMinutes === 0) {
        return `查询范围: ${diffHours}小时`
      }
      return `查询范围: ${diffHours}小时${remainingMinutes}分钟`
    }

    const remainingHours = diffHours % 24
    if (remainingHours === 0 && remainingMinutes === 0) {
      return `查询范围: ${diffDays}天`
    }
    if (remainingMinutes === 0) {
      return `查询范围: ${diffDays}天${remainingHours}小时`
    }
    return `查询范围: ${diffDays}天${remainingHours}小时${remainingMinutes}分钟`
  }

  return (
    <Form style={{ backgroundColor: '#fff' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <RangePicker
            showTime={{
              format: 'HH:mm',
              hideDisabledOptions: true,
              minuteStep: 1,
              secondStep: 60
            }}
            placeholder={['开始时间', '结束时间']}
            onChange={handleDateChange}
            format='YYYY-MM-DD HH:mm'
            value={selectedDateRange}
            disabledDate={disabledDate}
            disabledTime={disabledTime}
            ranges={ranges}
            style={{ minWidth: '400px' }}
            allowClear
            locale={{
              lang: {
                placeholder: '请选择时间',
                rangePlaceholder: ['开始时间', '结束时间'],
                today: '今天',
                now: '现在',
                backToToday: '返回今天',
                ok: '确定',
                clear: '清除',
                month: '月',
                year: '年',
                timeSelect: '选择时间',
                dateSelect: '选择日期',
                monthSelect: '选择月份',
                yearSelect: '选择年份',
                decadeSelect: '选择十年',
                previousMonth: '上个月',
                nextMonth: '下个月',
                previousYear: '上一年',
                nextYear: '下一年',
                previousDecade: '上一个十年',
                nextDecade: '下一个十年',
                previousCentury: '上一个世纪',
                nextCentury: '下一个世纪'
              }
            }}
          />
          <Button
            type='primary'
            onClick={handleSearchClick}
            loading={loading}
            disabled={loading || !selectedDateRange || !selectedDateRange[0] || !selectedDateRange[1]}
          >
            查询QPS数据
          </Button>
          <Button onClick={handleReset}>重置为实时数据</Button>
        </div>

        <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
          {selectedDateRange && selectedDateRange[0] && selectedDateRange[1] && (
            <div>
              <span>
                已选择: {selectedDateRange[0].format('YYYY-MM-DD HH:mm')} 至{' '}
                {selectedDateRange[1].format('YYYY-MM-DD HH:mm')}
              </span>
              <span>{getTimeRangeDescription()}</span>
            </div>
          )}
        </div>
      </div>
    </Form>
  )
}

SearchZone.propTypes = {
  selectedDateRange: PropTypes.array,
  handleDateRangeChange: PropTypes.func.isRequired,
  handleSearch: PropTypes.func.isRequired,
  handleReset: PropTypes.func.isRequired,
  loading: PropTypes.bool
}

export default SearchZone
