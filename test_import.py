#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试脚本 - 验证导入的数据
"""

import json
import re
from elasticsearch import Elasticsearch
from datetime import datetime

def test_es_connection():
    """测试ES连接"""
    try:
        es = Elasticsearch([{'host': 'localhost', 'port': 9200}])
        if es.ping():
            print("✓ ES连接正常")
            return es
        else:
            print("✗ ES连接失败")
            return None
    except Exception as e:
        print(f"✗ ES连接异常: {e}")
        return None

def get_indices_info(es):
    """获取索引信息"""
    try:
        indices = es.cat.indices(format='json')
        print("\n📊 索引信息:")
        for index in indices:
            if 'u2performance' in index['index']:
                print(f"  - 索引: {index['index']}")
                print(f"    文档数: {index['docs.count']}")
                print(f"    大小: {index['store.size']}")
        return True
    except Exception as e:
        print(f"✗ 获取索引信息失败: {e}")
        return False

def test_data_quality(es):
    """测试数据质量"""
    try:
        # 搜索所有文档
        response = es.search(
            index="u2performance_for_test",
            body={
                "query": {"match_all": {}},
                "size": 10
            }
        )
        
        total_docs = response['hits']['total']['value']
        print(f"\n📈 数据质量检查:")
        print(f"  总文档数: {total_docs}")
        
        # 检查几个样本文档
        docs = response['hits']['hits']
        ip_pattern = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
        
        valid_ips = 0
        valid_timestamps = 0
        valid_values = 0
        
        for doc in docs:
            source = doc['_source']
            
            # 检查IP地址
            if 'hostip' in source and ip_pattern.match(str(source['hostip'])):
                valid_ips += 1
            
            # 检查时间戳
            if '@timestamp' in source:
                valid_timestamps += 1
            
            # 检查数值字段
            if 'process_val' in source and isinstance(source['process_val'], (int, float)):
                valid_values += 1
        
        print(f"  有效IP地址: {valid_ips}/{len(docs)}")
        print(f"  有效时间戳: {valid_timestamps}/{len(docs)}")
        print(f"  有效数值: {valid_values}/{len(docs)}")
        
        return True
        
    except Exception as e:
        print(f"✗ 数据质量检查失败: {e}")
        return False

def test_search_functionality(es):
    """测试搜索功能"""
    try:
        print(f"\n🔍 搜索功能测试:")
        
        # 测试1: 按主机IP搜索
        response = es.search(
            index="u2performance_for_test",
            body={
                "query": {
                    "term": {
                        "hostip": "10.1.60.62"
                    }
                },
                "size": 1
            }
        )
        print(f"  按IP搜索结果: {response['hits']['total']['value']} 条")
        
        # 测试2: 按时间范围搜索
        response = es.search(
            index="u2performance_for_test",
            body={
                "query": {
                    "range": {
                        "@timestamp": {
                            "gte": "2025-01-01T00:00:00.000Z",
                            "lte": "2025-12-31T23:59:59.999Z"
                        }
                    }
                },
                "size": 0
            }
        )
        print(f"  按时间范围搜索结果: {response['hits']['total']['value']} 条")
        
        # 测试3: 聚合查询
        response = es.search(
            index="u2performance_for_test",
            body={
                "size": 0,
                "aggs": {
                    "vendors": {
                        "terms": {
                            "field": "vendor",
                            "size": 10
                        }
                    }
                }
            }
        )
        
        print(f"  厂商分布:")
        for bucket in response['aggregations']['vendors']['buckets']:
            print(f"    {bucket['key']}: {bucket['doc_count']} 条")
        
        return True
        
    except Exception as e:
        print(f"✗ 搜索功能测试失败: {e}")
        return False

def test_regex_validation():
    """测试正则表达式验证"""
    print(f"\n🧪 正则表达式验证测试:")
    
    # 测试IP地址正则
    ip_pattern = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
    test_ips = ['10.1.60.62', '192.168.1.1', '256.1.1.1', 'invalid.ip']
    
    print("  IP地址验证:")
    for ip in test_ips:
        valid = ip_pattern.match(ip) is not None
        status = "✓" if valid else "✗"
        print(f"    {status} {ip}: {'有效' if valid else '无效'}")
    
    # 测试主机名清理
    hostname_pattern = re.compile(r'[^\w\-\.]')
    test_hostnames = ['F5GTM2800A4.HL-GZFW.CT.JXA', 'host@name', 'host<name>']
    
    print("  主机名清理:")
    for hostname in test_hostnames:
        cleaned = hostname_pattern.sub('_', hostname)
        print(f"    {hostname} → {cleaned}")
    
    return True

def main():
    print("=" * 60)
    print("              Elasticsearch 导入数据测试")
    print("=" * 60)
    
    # 连接ES
    es = test_es_connection()
    if not es:
        return
    
    # 获取索引信息
    get_indices_info(es)
    
    # 测试数据质量
    test_data_quality(es)
    
    # 测试搜索功能
    test_search_functionality(es)
    
    # 测试正则表达式
    test_regex_validation()
    
    print(f"\n🎉 测试完成！")
    print("如果所有测试都通过，说明数据导入成功且质量良好。")

if __name__ == "__main__":
    main() 