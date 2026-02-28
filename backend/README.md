# Batch File Processor - Backend

This folder contains the Flask backend for the Batch File Processor application.

## Prerequisites

- Python 3.x
- pip

## Setup and Running

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   python app.py
   ```

The backend server will start (typically on `http://127.0.0.1:5000` unless configured otherwise).

## Main Files

- `app.py`: Entry point for the Flask application and API endpoints.
- `processor.py`: Logic for processing and combining CSV files.
- `requirements.txt`: List of Python dependencies.
