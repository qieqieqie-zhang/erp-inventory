@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   启动亚马逊ERP后端服务器
echo ========================================
echo.

cd /d "d:\codebuddy\库存管理\backend"

echo 检查端口占用...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo 端口3000已被占用，尝试终止相关进程...
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        taskkill /F /PID %%i >nul 2>&1
        echo 已终止进程PID: %%i
    )
)

echo.
echo 启动Node.js服务器...
node server.js

if %errorlevel% neq 0 (
    echo.
    echo 启动失败！错误代码: %errorlevel%
    pause
) else (
    echo.
    echo 服务器正常关闭
)