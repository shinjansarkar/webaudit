# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies for lxml
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libxml2-dev libxslt1-dev && \
    rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy project files
COPY . /app/

# Expose port (adjust if your app uses a different port)
EXPOSE 8000

# Start the app (adjust if your entry point is different)
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
