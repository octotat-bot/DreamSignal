# syntax=docker/dockerfile:1
#
# faster-whisper invokes ffmpeg on the audio stream before passing it
# to CTranslate2, so ffmpeg must be present in the runtime image.
FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/ai-service

COPY ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ai-service/ ./

ENV PYTHONUNBUFFERED=1
EXPOSE 8001

CMD ["python", "main.py"]
