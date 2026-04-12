from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}

@app.get("/api/hello")
def hello():
    return {"message": "Hello from Python backend"}