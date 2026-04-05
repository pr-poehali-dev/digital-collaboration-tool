"""Справочник сотрудников: список, создание, обновление"""
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
            cur.execute("SELECT id, name, position, salary FROM employees WHERE user_id = %s ORDER BY name", (user_id,))
            rows = cur.fetchall()
            employees = [{"id": r[0], "name": r[1], "position": r[2], "salary": float(r[3])} for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"employees": employees}, ensure_ascii=False)}

        # Создать
        if method == "POST":
            name = body.get("name", "").strip()
            if not name:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите имя"}, ensure_ascii=False)}
            cur.execute(
                "INSERT INTO employees (user_id, name, position, salary) VALUES (%s, %s, %s, %s) RETURNING id, name, position, salary",
                (user_id, name, body.get("position", ""), body.get("salary", 0))
            )
            r = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"employee": {"id": r[0], "name": r[1], "position": r[2], "salary": float(r[3])}}, ensure_ascii=False)}

        # Обновить
        if method == "PUT":
            emp_id = params.get("id")
            cur.execute(
                "UPDATE employees SET name=%s, position=%s, salary=%s WHERE id=%s AND user_id=%s RETURNING id, name, position, salary",
                (body.get("name"), body.get("position", ""), body.get("salary", 0), emp_id, user_id)
            )
            r = cur.fetchone()
            conn.commit()
            if not r:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Не найден"}, ensure_ascii=False)}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"employee": {"id": r[0], "name": r[1], "position": r[2], "salary": float(r[3])}}, ensure_ascii=False)}

        # Удалить
        if method == "DELETE":
            emp_id = params.get("id")
            cur.execute("UPDATE employees SET user_id = user_id WHERE id=%s AND user_id=%s RETURNING id", (emp_id, user_id))
            if not cur.fetchone():
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Не найден"}, ensure_ascii=False)}
            cur.execute("DELETE FROM employees WHERE id=%s AND user_id=%s", (emp_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True}, ensure_ascii=False)}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"}, ensure_ascii=False)}

    finally:
        cur.close()
        conn.close()