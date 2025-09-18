# ES代理配置修复总结

## 问题描述
```
POST http://127.0.0.1:8080/u2performance_for_test/_search/ 404 (Not Found)
```

## 问题分析

### 1. 错误原因
- ES服务器代理配置不正确
- `.roadhogrc.js` 中的ES代理目标地址与实际ES服务器地址不匹配
- 服务文件中缺少正确的URL构建逻辑

### 2. 问题定位
- 原配置: `http://localhost:9200`
- 实际访问: `http://127.0.0.1:8080`
- 服务文件未使用配置系统的ES API路径

## 修复方案

### 1. 更新服务文件 - `services/chddetail.js`

**修改前**:
```javascript
import request from '../utils/request'

export async function queryRoleDetailService(params) {
  return request({
    url: `${params.paths}`,
    method: 'post',
    data: params.es
  })
}
```

**修改后**:
```javascript
import { request, config } from 'utils'

const { api } = config
const { es } = api

export async function queryRoleDetailService(params) {
  const { paths, es: dslQuery } = params
  const esUrl = `${es}${paths}`

  return request({
    url: esUrl,
    method: 'post',
    data: dslQuery
  })
}
```

### 2. 更新代理配置 - `.roadhogrc.js`

**修改前**:
```javascript
"/api/es": {
  "target": "http://localhost:9200",
  "changeOrigin": true,
  "pathRewrite": { "^/api/es" : "" }
}
```

**修改后**:
```javascript
"/api/es": {
  "target": "http://127.0.0.1:8080",
  "changeOrigin": true,
  "pathRewrite": { "^/api/es" : "" }
}
```

## 配置说明

### ES API路径构建
```javascript
// 配置文件中的ES API路径
const ES_API = '/api/es'
api: {
  es: `${ES_API}`,  // 结果: '/api/es'
}

// 服务中的URL构建
const esUrl = `${es}${paths}`
// 例如: '/api/es' + '/u2performance_for_test/_search/'
// 结果: '/api/es/u2performance_for_test/_search/'
```

### 代理转换过程
```
1. 前端请求: /api/es/u2performance_for_test/_search/
2. 代理重写: ^/api/es -> "" (移除前缀)
3. 目标请求: http://127.0.0.1:8080/u2performance_for_test/_search/
```

## 验证步骤

1. **重新启动开发服务器**:
   ```bash
   npm start
   ```

2. **检查代理配置**:
   - 确认ES服务器运行在 `127.0.0.1:8080`
   - 验证代理路径重写正确

3. **测试角色详情功能**:
   - 访问QPS列表页面
   - 点击角色链接跳转到详情页面
   - 检查网络请求是否成功

## 相关文件

- **服务文件**: `src/services/chddetail.js`
- **代理配置**: `.roadhogrc.js`
- **API配置**: `src/utils/config.js`
- **模型文件**: `src/models/chddetail.js`

## 注意事项

1. **开发环境**: 代理配置只在开发环境生效
2. **生产环境**: 需要在生产环境中配置相应的反向代理
3. **ES服务器**: 确保ES服务器正常运行并可访问
4. **网络安全**: 检查防火墙和网络策略设置

## 后续优化建议

1. **环境配置**: 考虑为不同环境设置不同的ES服务器地址
2. **错误处理**: 增强ES连接失败时的错误处理
3. **监控**: 添加ES服务器健康检查
4. **文档**: 更新部署文档中的ES配置说明 