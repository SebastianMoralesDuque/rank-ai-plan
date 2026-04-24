FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install browsers for Playwright
RUN playwright install chromium

# Copy script and URLs
COPY focalizado.py .
COPY urls.txt .

# Environment variables will be provided by Coolify
# DATABASE_URL
# OLLAMA_API_KEY
# OLLAMA_MODEL

CMD ["python", "focalizado.py"]
