# Use lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
# ADDED: build-essential, python3-dev, pkg-config, libcairo2-dev
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    build-essential \
    python3-dev \
    pkg-config \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .
# Create storage folders so the app doesn't crash
RUN mkdir -p storage/audio_samples storage/history

# Command to run the server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]