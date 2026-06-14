FROM python:3.12-slim

WORKDIR /app

COPY safesprout_python.py /app/safesprout_python.py
COPY index.html /app/index.html
COPY style.css /app/style.css
COPY js.js /app/js.js
COPY family-tech-hub.png /app/family-tech-hub.png
COPY assets /app/assets

EXPOSE 8001

CMD ["python", "safesprout_python.py"]
