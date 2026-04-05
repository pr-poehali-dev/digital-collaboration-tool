"""Справочник видов выработки: список, создание, обновление, удаление"""
import json
import os
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_id(cur, token: str):
    cur.execute(
        "SELECT user_id FROM sessions WHERE token = %s AND expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    token = event.get("headers", {}).get("X-Session-Token", "")
    body = json.loads(event.get("body") or "{}")
    params = event.get("queryStringParameters") or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, token)
        if not user_id:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"}, ensure_ascii=False)}

        # Список
        if method == "GET":
            cur.execute("SELECT id, name, rate FROM work_categories WHERE user_id = %s ORDER BY name", (user_id,))
            rows = cur.fetchall()
            cats = [{"id": r[0], "name": r[1], "rate": float(r[2])} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"categories": cats}, ensure_ascii=False)}

        # Создать
        if method == "POST":
            name = body.get("name", "").strip()
            if not name:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите название"}, ensure_ascii=False)}
            cur.execute(
                "INSERT INTO work_categories (user_id, name, rate) VALUES (%s, %s, %s) RETURNING id, name, rate",
                (user_id, name, body.get("rate", 10))
            )
            r = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"category": {"id": r[0], "name": r[1], "rate": float(r[2])}}, ensure_ascii=False)}

        # Обновить
        if method == "PUT":
            cat_id = params.get("id")
            cur.execute(
                "UPDATE work_categories SET name=%s, rate=%s WHERE id=%s AND user_id=%s RETURNING id, name, rate",
                (body.get("name"), body.get("rate", 10), cat_id, user_id)
            )
            r = cur.fetchone()
            conn.commit()
            if not r:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Не найден"}, ensure_ascii=False)}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"category": {"id": r[0], "name": r[1], "rate": float(r[2])}}, ensure_ascii=False)}

        # Удалить
        if method == "DELETE":
            cat_id = params.get("id")
            cur.execute("SELECT id FROM work_categories WHERE id=%s AND user_id=%s", (cat_id, user_id))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Не найден"}, ensure_ascii=False)}
            cur.execute("DELETE FROM work_categories WHERE id=%s AND user_id=%s", (cat_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"}, ensure_ascii=False)}

    finally:
        cur.close()
        conn.close()