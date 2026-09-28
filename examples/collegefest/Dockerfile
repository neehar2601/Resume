# Use the slim Python base image to reduce image size.
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir firebase-admin

COPY . .

EXPOSE 5000
CMD ["python3", "app.py"]
