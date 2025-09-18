#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速导入脚本 - 简化版本
用于快速将u2performance_for_test_import2.json导入到本地ES
"""

import subprocess
import sys
import os

def check_dependencies():
    """检查依赖是否安装"""
    try:
        import elasticsearch
        print("✓ elasticsearch 已安装")
        return True
    except ImportError:
        print("✗ elasticsearch 未安装")
        return False

def install_dependencies():
    """安装依赖"""
    print("正在安装依赖...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ 依赖安装完成")
        return True
    except subprocess.CalledProcessError:
        print("✗ 依赖安装失败")
        return False

def check_es_connection():
    """检查ES连接"""
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch([{'host': 'localhost', 'port': 9200}])
        if es.ping():
            print("✓ Elasticsearch 连接正常")
            return True
        else:
            print("✗ 无法连接到Elasticsearch")
            return False
    except Exception as e:
        print(f"✗ ES连接检查失败: {e}")
        return False

def run_import():
    """运行导入"""
    print("开始导入数据...")
    try:
        result = subprocess.run([
            sys.executable, "import_to_es.py",
            "--file", "u2performance_for_test_import2.json",
            "--host", "localhost",
            "--port", "9200",
            "--batch-size", "1000",
            "--index", "u2performance_for_test"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ 数据导入成功！")
            print(result.stdout)
            return True
        else:
            print("✗ 数据导入失败！")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"✗ 导入过程出错: {e}")
        return False

def main():
    print("=" * 50)
    print("Elasticsearch 数据快速导入工具")
    print("=" * 50)
    
    # 检查文件是否存在
    if not os.path.exists("u2performance_for_test_import2.json"):
        print("✗ u2performance_for_test_import2.json 文件不存在")
        return
    
    # 检查依赖
    if not check_dependencies():
        if not install_dependencies():
            return
    
    # 检查ES连接
    if not check_es_connection():
        print("请确保Elasticsearch服务正在运行，地址为 localhost:9200")
        return
    
    # 运行导入
    if run_import():
        print("\n🎉 导入完成！")
        print("您可以通过以下方式查看数据：")
        print("1. 访问 http://localhost:9200/_cat/indices 查看索引")
        print("2. 使用 Kibana 或其他ES工具查看数据")
    else:
        print("\n❌ 导入失败，请查看错误信息")

if __name__ == "__main__":
    main() 