SELECT *
FROM values(
  'order_id UInt16, customer String, city String, amount UInt16, status String',
  (101, 'Анна', 'Москва', 1200, 'paid'),
  (102, 'Борис', 'Казань', 800, 'new'),
  (103, 'Анна', 'Москва', 600, 'paid'))
ORDER BY order_id;
