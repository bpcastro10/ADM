@echo off
cd backend
python -m venv .venv
call .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app:app --reload --reload-exclude ".venv" --host 127.0.0.1 --port 8000
pause
