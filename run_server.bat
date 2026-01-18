@echo off
echo Starting Huey World Server...
echo ---------------------------------------------
echo [PC] Local Address: http://localhost:8000
echo [Mobile] Network Address: http://118.34.160.149:8000
echo ---------------------------------------------
echo.
uvicorn server:socket_app --host 0.0.0.0 --port 8000 --reload
pause
