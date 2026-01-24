from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import uvicorn
import os

app = FastAPI(title="Huey3D Prototype")

# Mount Static Files from existing static directory
# We'll use the same assets, but a new HTML file
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_3d_index():
    # Serve our new 3D prototype file
    return FileResponse('static/3d.html')

if __name__ == "__main__":
    print("Fox 🦊 is entering the 3rd dimension...")
    print("Server running at http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
