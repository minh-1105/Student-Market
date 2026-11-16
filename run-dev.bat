@echo off
setlocal
REM ==========================================================
REM  Chay nhanh Backend (.NET) + Frontend (Next.js) de test
REM  Backend : http://localhost:5033  (Swagger: /swagger)
REM  Frontend: http://localhost:3000
REM ==========================================================
set "ROOT=%~dp0"
set "BE=%ROOT%student-flea-market-be\StudentFleaMarket.API"
set "FE=%ROOT%student-flea-market-fe"

REM ---- 1. DB: connection string lay tu user-secrets (hien dang tro Supabase),
REM         nen khong kiem tra Postgres local o day.

REM ---- 2. Backend
netstat -ano | findstr /R /C:":5033 .*LISTENING" >nul
if errorlevel 1 (
    echo [BE] Dang khoi dong backend...
    start "Backend - StudentFleaMarket.API" cmd /k "cd /d "%BE%" && dotnet run --launch-profile http"
) else (
    echo [BE] Backend da chay san tren port 5033, bo qua.
)

REM ---- 3. Cho backend san sang (toi da ~90s)
echo [BE] Dang cho backend san sang...
set /a TRIES=0
:waitbe
curl -s -o nul http://localhost:5033/health && goto bedone
set /a TRIES+=1
if %TRIES% GEQ 45 (
    echo [BE] Backend chua len sau 90s - xem loi trong cua so "Backend".
    goto startfe
)
timeout /t 2 /nobreak >nul
goto waitbe
:bedone
echo [BE] OK - http://localhost:5033/swagger

REM ---- 4. Frontend
:startfe
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if errorlevel 1 (
    if not exist "%FE%\node_modules" (
        echo [FE] Chua co node_modules, dang chay npm install...
        pushd "%FE%" && call npm install && popd
    )
    echo [FE] Dang khoi dong frontend...
    start "Frontend - Next.js" cmd /k "cd /d "%FE%" && npm run dev"
) else (
    echo [FE] Frontend da chay san tren port 3000, bo qua.
)

REM ---- 5. Mo trinh duyet
timeout /t 6 /nobreak >nul
start "" http://localhost:3000
echo.
echo Xong. Dong 2 cua so "Backend" va "Frontend" (hoac chay stop-dev.bat) de tat.
endlocal
