@echo off
echo Starting Huey World Server...
echo ---------------------------------------------
echo [PC] Local Address: http://localhost:8000
echo [PC] 3D Prototype: http://localhost:8000/static/index3d.html
echo [Mobile] Network Address: http://118.34.160.149:8000
echo [Mobile] 3D Prototype: http://118.34.160.149:8000/static/index3d.html
echo ---------------------------------------------
echo.
uvicorn server:socket_app --host 0.0.0.0 --port 8000 --reload
pause
