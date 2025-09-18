import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'dva'
import { Button, Card, Row, Col, Icon } from 'antd'
import { routerRedux } from 'dva/router'
import { Page } from 'components'
import styles from './index.less'

const MyPerForm = ({ dispatch }) => {
  // 跳转到 performHost 页面
  const handleNavigateToPerformHost = () => {
    // 传递一些默认参数给 performHost 页面
    dispatch(routerRedux.push({
      pathname: '/performHost',
      search: '?FirstOccurrence=1747645200&source=Zabbix-Epp@NT-114175&ip_addr=10.1.10.6&itemid=5167255&range=900'
    }))
  }

  return (
    <Page className={styles.myPerForm}>
      <Row gutter={24}>
        <Col span={24}>
          <Card title="性能监控管理" bordered={false} className={styles.performanceCard}>
            <div className={styles.contentWrapper}>
              <Icon type="dashboard" style={{ fontSize: '48px', color: '#1890ff', marginBottom: '20px' }} />
              <h2>性能监控管理页面</h2>
              <p className={styles.description}>
                欢迎使用性能监控管理系统，点击下方按钮进入详细的性能监控页面，
                查看服务器性能指标、监控数据分析等功能。
              </p>
              <Button
                type="primary"
                size="large"
                onClick={handleNavigateToPerformHost}
                className={styles.navButton}
                icon="line-chart"
              >
                进入性能监控页面
              </Button>

              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <div className={styles.featureTitle}>
                    <Icon type="monitor" style={{ marginRight: '8px' }} />
                    实时监控
                  </div>
                  <div className={styles.featureDesc}>
                    实时查看服务器性能指标，包括CPU、内存、磁盘等使用情况
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureTitle}>
                    <Icon type="bar-chart" style={{ marginRight: '8px' }} />
                    数据分析
                  </div>
                  <div className={styles.featureDesc}>
                    提供详细的性能数据分析和图表展示，帮助您了解系统运行状态
                  </div>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureTitle}>
                    <Icon type="alert" style={{ marginRight: '8px' }} />
                    告警管理
                  </div>
                  <div className={styles.featureDesc}>
                    智能告警系统，及时发现并通知系统异常情况
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Page>
  )
}

MyPerForm.propTypes = {
  dispatch: PropTypes.func.isRequired
}

export default connect()(MyPerForm)
