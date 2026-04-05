"""Производственный календарь РФ — количество рабочих дней в месяце"""
import json
import os
import urllib.request

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    year = params.get("year")
    month = params.get("month")

    if not year or not month:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укаж��те year и month"}, ensure_ascii=False)}

    url = f"https://isdayoff.ru/api/getdata?year={year}&month={month}"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = resp.read().decode("utf-8").strip()
    except Exception as e:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": f"Ошибка получения календаря: {str(e)}"}, ensure_ascii=False)}

    days = [int(d) for d in data if d in ("0", "1")]
    work_days = days.count(0)
    total_days = len(days)

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "year": int(year),
            "month": int(month),
            "work_days": work_days,
            "total_days": total_days,
            "days": days
        }, ensure_ascii=False)
    }
