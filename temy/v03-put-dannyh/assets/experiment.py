"""Изолированный учебный опыт. Нужен СВОЙ пустой ClickHouse, не общий стенд.
Запуск: CH_URL=http://127.0.0.1:18373 CH_USER=student CH_PASSWORD=student python3 experiment.py
Создаёт default.v03_orders; при существующей таблице останавливается, ничего не удаляет.
Источник — синтетический source.csv рядом со скриптом. SQL изучается в следующих главах.
"""
import base64
import csv
import os
from pathlib import Path
from urllib.request import Request, urlopen

url = os.environ['CH_URL']
token = base64.b64encode((os.environ['CH_USER'] + ':' + os.environ['CH_PASSWORD']).encode()).decode()

def sql(query):
    req = Request(url, data=query.encode(), headers={'Authorization': 'Basic ' + token})
    with urlopen(req, timeout=30) as response:
        return response.read().decode().strip()

rows = list(csv.DictReader((Path(__file__).parent / 'source.csv').open()))
print('ClickHouse:', sql('SELECT version()'))
print('Источник: событий =', len(rows), '; сумма =', sum(int(r['amount_rub']) for r in rows))
sql('CREATE TABLE default.v03_orders (event_id UInt32, event_time DateTime, amount_rub UInt32) ENGINE = MergeTree ORDER BY event_id')
query = 'SELECT count() AS rows, sum(amount_rub) AS amount_rub, max(event_time) AS latest_event FROM default.v03_orders FORMAT TSVWithNames'
print('До загрузки:\n' + sql('SELECT count() AS rows FROM default.v03_orders FORMAT TSVWithNames'))

def load(selected):
    values = ','.join(f"({r['event_id']},'{r['event_time']}',{r['amount_rub']})" for r in selected)
    sql('INSERT INTO default.v03_orders VALUES ' + values)

# Намеренно пропускаем 102. Это моделирование сбоя отбора, не отказ ClickHouse.
load([rows[0], rows[2]])
print('После неполной загрузки:\n' + sql(query))
# Моделируем повторную отправку 101, как если бы подтверждение потерялось.
load([rows[0]])
print('После повторной отправки 101:\n' + sql(query))
print('Сверка по событиям:\n' + sql('SELECT event_id, count() AS copies FROM default.v03_orders GROUP BY event_id ORDER BY event_id FORMAT TSVWithNames'))
print('В источнике event_id:', ', '.join(r['event_id'] for r in rows))
