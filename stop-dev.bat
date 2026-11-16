@echo off
REM Tat backend (5033) va frontend (3000) dang chay
for %%P in (5033 3000) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
        echo Tat process %%A tren port %%P
        taskkill /PID %%A /T /F >nul 2>&1
    )
)
echo Da tat xong.
timeout /t 2 >nul
