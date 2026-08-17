# StyleVerse AI Backend

This folder contains the FastAPI backend foundation for StyleVerse AI.

## Prerequisites

- Python 3.11+
- PostgreSQL server running locally or on a remote host
- Git

## Setup

1. Open a terminal in `backend/`.
2. Create a virtual environment:

   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:

   Windows PowerShell:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   Windows CMD:

   ```cmd
   .\.venv\Scripts\activate.bat
   ```

4. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

5. Copy the environment template:

   ```bash
   copy .env.example .env
   ```

6. Update `.env` with your local PostgreSQL settings if needed.

## Run the app

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Check the health endpoint:

```bash
http://127.0.0.1:8000/api/health
```

Expected response:

```json
{"status": "ok"}
```

## Notes

- This setup only configures the FastAPI + SQLAlchemy foundation.
- No application tables, login, products, wishlist, cart, AI, or payment APIs have been created yet.
- Database credentials should stay in `.env` and never be committed to version control.
