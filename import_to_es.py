#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Elasticsearch数据导入脚本
用于将222.json文件中的数据导入到本地Elasticsearch的指定索引u2performance_for_test
"""

import json
import re
import logging
from datetime import datetime
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
import argparse
import sys
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('es_import.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ESImporter:
    def __init__(self, es_host='localhost', es_port=9200, es_user=None, es_password=None):
        """
        初始化ES连接
        """
        self.es_config = {
            'host': es_host,
            'port': es_port,
            'timeout': 30,
            'max_retries': 3,
            'retry_on_timeout': True
        }
        
        if es_user and es_password:
            self.es_config['http_auth'] = (es_user, es_password)
        
        try:
            self.es = Elasticsearch([self.es_config])
            # 测试连接
            if not self.es.ping():
                raise ConnectionError("无法连接到Elasticsearch")
            logger.info(f"成功连接到Elasticsearch: {es_host}:{es_port}")
        except Exception as e:
            logger.error(f"连接Elasticsearch失败: {e}")
            raise

    def clean_and_validate_data(self, doc_source):
        """
        数据清洗和验证，使用正则表达式处理
        """
        cleaned_data = {}
        
        # 正则表达式模式
        patterns = {
            'ip_pattern': re.compile(r'^(\d{1,3}\.){3}\d{1,3}$'),
            'hostname_pattern': re.compile(r'^[a-zA-Z0-9\-\.]+$'),
            'timestamp_pattern': re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'),
            'email_pattern': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
            'numeric_pattern': re.compile(r'^-?\d+(\.\d+)?$'),
            'chinese_pattern': re.compile(r'[\u4e00-\u9fff]+'),
            'alphanumeric_pattern': re.compile(r'^[a-zA-Z0-9_\-]+$')
        }
        
        for key, value in doc_source.items():
            if value is None or value == "" or value == "undefined":
                continue
                
            # 转换为字符串进行处理
            str_value = str(value)
            
            # 根据字段名称和内容进行特定处理
            if key in ['hostip', 'keyword'] and patterns['ip_pattern'].match(str_value):
                cleaned_data[key] = str_value
            elif key in ['hostname', 'moname'] and len(str_value) > 0:
                # 清理主机名中的特殊字符
                cleaned_value = re.sub(r'[^\w\-\.]', '_', str_value)
                cleaned_data[key] = cleaned_value
            elif key in ['@timestamp'] and patterns['timestamp_pattern'].match(str_value):
                cleaned_data[key] = str_value
            elif key in ['process_val', 'value', 'ns', 'clock', 'ts', '__PROCESS_TIME__', 'itemid']:
                # 数值字段处理
                try:
                    if '.' in str_value:
                        cleaned_data[key] = float(value)
                    else:
                        cleaned_data[key] = int(value)
                except (ValueError, TypeError):
                    logger.warning(f"无法转换数值字段 {key}: {value}")
                    continue
            elif key in ['agent', 'mngtorg', 'type', 'componetype', 'appname', 'bizarea', 'vendor']:
                # 文本字段清理
                cleaned_value = re.sub(r'[<>"\']', '', str_value)  # 移除潜在的危险字符
                cleaned_data[key] = cleaned_value.strip()
            elif key in ['kpi'] and isinstance(value, list):
                # 数组字段处理
                cleaned_data[key] = [str(item).strip() for item in value if item]
            else:
                # 其他字段的通用处理
                if isinstance(value, str):
                    cleaned_value = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', str_value)  # 移除控制字符
                    cleaned_data[key] = cleaned_value.strip()
                else:
                    cleaned_data[key] = value
        
        return cleaned_data

    def process_document(self, doc, target_index='u2performance_for_test'):
        """
        处理单个文档
        """
        try:
            # 使用指定的索引名称，而不是从文档中获取
            index_name = target_index
            doc_id = doc.get('_id')
            source = doc.get('_source', {})
            
            # 数据清洗
            cleaned_source = self.clean_and_validate_data(source)
            
            # 添加导入时间戳
            cleaned_source['import_timestamp'] = datetime.now().isoformat()
            
            # 构建ES文档 (移除_type字段，因为ES 8.x不支持)
            es_doc = {
                '_index': index_name,
                '_source': cleaned_source
            }
            
            # 如果有ID，则添加
            if doc_id:
                es_doc['_id'] = doc_id
            
            return es_doc
            
        except Exception as e:
            logger.error(f"处理文档失败: {e}")
            return None

    def create_index_if_not_exists(self, index_name):
        """
        如果索引不存在则创建
        """
        try:
            if not self.es.indices.exists(index=index_name):
                # 索引映射配置
                mapping = {
                    "mappings": {
                        "properties": {
                            "hostip": {"type": "ip"},
                            "hostname": {"type": "keyword"},
                            "process_val": {"type": "double"},
                            "value": {"type": "double"},
                            "ns": {"type": "long"},
                            "clock": {"type": "long"},
                            "ts": {"type": "long"},
                            "__PROCESS_TIME__": {"type": "long"},
                            "itemid": {"type": "long"},
                            "@timestamp": {"type": "date"},
                            "import_timestamp": {"type": "date"},
                            "agent": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                            "mngtorg": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                            "type": {"type": "keyword"},
                            "componetype": {"type": "keyword"},
                            "appname": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                            "bizarea": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                            "vendor": {"type": "keyword"},
                            "kpi": {"type": "keyword"},
                            "moname": {"type": "text", "fields": {"keyword": {"type": "keyword"}}}
                        }
                    },
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 0,
                        "refresh_interval": "1s"
                    }
                }
                
                self.es.indices.create(index=index_name, body=mapping)
                logger.info(f"创建索引: {index_name}")
            else:
                logger.info(f"索引已存在: {index_name}")
                
        except Exception as e:
            logger.error(f"创建索引失败: {e}")
            raise

    def import_data(self, json_file_path, batch_size=1000, target_index='u2performance_for_test'):
        """
        导入数据到ES
        """
        if not os.path.exists(json_file_path):
            logger.error(f"文件不存在: {json_file_path}")
            return False
        
        try:
            logger.info(f"开始读取文件: {json_file_path}")
            logger.info(f"目标索引: {target_index}")
            
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                logger.error("JSON文件格式错误，应该是数组格式")
                return False
            
            logger.info(f"共读取到 {len(data)} 条记录")
            
            # 使用指定的索引名称
            processed_docs = []
            
            # 处理文档
            for i, doc in enumerate(data):
                processed_doc = self.process_document(doc, target_index)
                if processed_doc:
                    processed_docs.append(processed_doc)
                
                if (i + 1) % 1000 == 0:
                    logger.info(f"已处理 {i + 1} 条记录...")
            
            # 创建索引
            self.create_index_if_not_exists(target_index)
            
            # 批量导入
            logger.info(f"开始批量导入 {len(processed_docs)} 条记录到索引 {target_index}...")
            
            success_count = 0
            error_count = 0
            
            for i in range(0, len(processed_docs), batch_size):
                batch = processed_docs[i:i + batch_size]
                
                try:
                    # 使用bulk API批量导入
                    success, failed = bulk(
                        self.es,
                        batch,
                        index=target_index,  # 使用指定的索引
                        chunk_size=batch_size,
                        request_timeout=60,
                        max_retries=3,
                        initial_backoff=2,
                        max_backoff=600
                    )
                    
                    success_count += success
                    error_count += len(failed)
                    
                    logger.info(f"批次 {i//batch_size + 1}: 成功 {success} 条，失败 {len(failed)} 条")
                    
                    # 记录失败的文档
                    for fail_doc in failed:
                        logger.error(f"导入失败: {fail_doc}")
                        
                except Exception as e:
                    logger.error(f"批量导入失败: {e}")
                    error_count += len(batch)
            
            logger.info(f"导入完成！成功: {success_count} 条，失败: {error_count} 条")
            
            # 刷新索引
            self.es.indices.refresh(index=target_index)
            
            return True
            
        except Exception as e:
            logger.error(f"导入数据失败: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description='导入JSON数据到Elasticsearch')
    parser.add_argument('--file', '-f', default='u2performance_for_test_import2.json', help='JSON文件路径')
    parser.add_argument('--host', default='localhost', help='ES主机地址')
    parser.add_argument('--port', type=int, default=9200, help='ES端口')
    parser.add_argument('--user', help='ES用户名')
    parser.add_argument('--password', help='ES密码')
    parser.add_argument('--batch-size', type=int, default=1000, help='批量导入大小')
    parser.add_argument('--index', '-i', default='u2performance_for_test', help='目标索引名称')
    
    args = parser.parse_args()
    
    try:
        # 创建导入器
        importer = ESImporter(
            es_host=args.host,
            es_port=args.port,
            es_user=args.user,
            es_password=args.password
        )
        
        # 导入数据
        success = importer.import_data(args.file, args.batch_size, args.index)
        
        if success:
            logger.info("数据导入成功！")
            sys.exit(0)
        else:
            logger.error("数据导入失败！")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"程序执行失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 