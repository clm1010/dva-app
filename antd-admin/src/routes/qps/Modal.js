import React from 'react'
import PropTypes from 'prop-types'
import { Modal } from 'antd'
import LineChart1 from './LineChart1'

const QpsModal = ({
  visible,
  onCancel,
  deviceName,
  deviceData,
  totalData,
  loading = false
}) => {
  const modalOpts = {
    title: `${deviceName || '设备'} QPS 曲线图`,
    visible,
    onCancel,
    footer: null, // 移除确定按钮，只保留关闭
    width: 1000,
    height: 600,
    destroyOnClose: true, // 关闭时销毁内容
    maskClosable: false, // 点击遮罩不关闭
    keyboard: true, // 支持ESC键关闭
    centered: true // 居中显示
  }

  // 默认数据，防止undefined错误
  const defaultChartData = {
    categories: [],
    values: []
  }

  const safeDeviceData = deviceData || defaultChartData
  const safeTotalData = totalData || defaultChartData

  return (
    <Modal {...modalOpts}>
      <div style={{ padding: '20px 0' }}>
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px', color: '#333' }}>
            {deviceName || '设备'} QPS 曲线图
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              加载中...
            </div>
          ) : (
            <LineChart1 data={safeDeviceData} />
          )}
        </div>

        <div>
          <h3 style={{ marginBottom: '10px', color: '#333' }}>
            所有设备 QPS 累加曲线图
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              加载中...
            </div>
          ) : (
            <LineChart1 data={safeTotalData} />
          )}
        </div>
      </div>
    </Modal>
  )
}

QpsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  deviceName: PropTypes.string,
  deviceData: PropTypes.shape({
    categories: PropTypes.array,
    values: PropTypes.array
  }),
  totalData: PropTypes.shape({
    categories: PropTypes.array,
    values: PropTypes.array
  }),
  loading: PropTypes.bool
}

QpsModal.defaultProps = {
  deviceName: '',
  deviceData: null,
  totalData: null,
  loading: false
}

export default QpsModal
