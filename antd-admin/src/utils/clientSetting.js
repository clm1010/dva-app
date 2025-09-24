// 客户端设置和字典值管理

// 模拟字典配置
const dictConfig = {
  performanceCurve: {
    // ntZabbixPerformance: 'nt_zabbix_performance',
    u2performance: 'u2performance'
  }
};

/**
 * 获取字典值
 * @param {string} category - 字典类别
 * @param {string} key - 字典键
 * @returns {string} 字典值
 */
export function getDictValue(category, key) {
  if (dictConfig[category] && dictConfig[category][key]) {
    return dictConfig[category][key];
  }

  // 如果找不到对应的字典值，返回默认值
  console.warn(`Dictionary value not found for category: ${category}, key: ${key}`);
  return key; // 返回 key 作为默认值
}
