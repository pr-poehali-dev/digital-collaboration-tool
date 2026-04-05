"""Авторизация: регистрация, вход, выход, проверка сессии"""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")
    token = event.get("headers", {}).get("X-Session-Token", "")

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Проверка сессии (GET)
        if method == "GET":
            cur.execute(
                "SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()",
                (token,)
            )
            user = cur.fetchone()
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": {"id": user[0], "name": user[1], "email": user[2]}}, ensure_ascii=False)}

        # Регистрация
        if action == "register":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "")
            name = body.get("name", "").strip()

            if not email or not password or not name:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Заполните все поля"}, ensure_ascii=False)}

            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Email уже зарегистрирован"}, ensure_ascii=False)}

            cur.execute(
                "INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id, name, email",
                (email, hash_password(password), name)
            )
            user = cur.fetchone()
            token = secrets.token_hex(32)
            expires = datetime.now() + timedelta(days=30)
            cur.execute("INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user[0], token, expires))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": token, "user": {"id": user[0], "name": user[1], "email": user[2]}}, ensure_ascii=False)}

        # Вход
        if action == "login":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "")

            cur.execute("SELECT id, name, email FROM users WHERE email = %s AND password_hash = %s", (email, hash_password(password)))
            user = cur.fetchone()
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"}, ensure_ascii=False)}

            token = secrets.token_hex(32)
            expires = datetime.now() + timedelta(days=30)
            cur.execute("INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (user[0], token, expires))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"token": token, "user": {"id": user[0], "name": user[1], "email": user[2]}}, ensure_ascii=False)}

        # Выход
        if action == "logout":
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"}, ensure_ascii=False)}

    finally:
        cur.close()
        conn.close()
