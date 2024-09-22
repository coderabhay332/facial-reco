# Use an official Python 3.11.3 runtime as a parent image
FROM python:3.11-slim-bullseye


ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install dlib and face_recognition dependencies
RUN pip install --upgrade pip
RUN pip install numpy opencv-python-headless face-recognition

# Set the working directory inside the container
WORKDIR /app

# Copy your project files into the container
COPY . /app

EXPOSE 8000

# Define the command to run your Python script
CMD ["python", "main.py"]
