from fastapi import FastAPI

app = FastAPI(
    title="Energy Consumption Mart API",
    description="Analytics API for smart-meter energy consumption",
    version="1.0.0",
)


@app.get("/")
def root():
    return {
        "message": "Energy Consumption Mart API is running",
        "status": "ok",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}