@echo off
chcp 65001 > nul
title Elasticsearch数据导入工具

echo.
echo ================================================
echo          Elasticsearch 数据导入工具
echo ================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python未安装或未添加到PATH
    echo 请先安装Python 3.6+
    pause
    exit /b 1
)

REM 检查文件是否存在
if not exist "222.json" (
    echo ❌ 222.json 文件不存在
    echo 请确保222.json文件在当前目录
    pause
    exit /b 1
)

REM 运行快速导入脚本
python quick_import.py

echo.
echo 按任意键退出...
pause >nul 