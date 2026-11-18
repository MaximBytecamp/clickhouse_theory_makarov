CREATE DATABASE IF NOT EXISTS sandbox;
CREATE TABLE sandbox.null_lesson (
    id UInt8,
    price UInt16,
    discount Nullable(UInt8),
    label Nullable(String)
) ENGINE = Memory;
INSERT INTO sandbox.null_lesson VALUES
    (1, 100, 0, ''),
    (2, 100, 10, 'sale'),
    (3, 100, NULL, NULL);
CREATE TABLE sandbox.null_insert (
    id UInt8,
    discount Nullable(UInt8),
    qty UInt8,
    city String DEFAULT 'не указан'
) ENGINE = Memory;
INSERT INTO sandbox.null_insert (id) VALUES (1);
INSERT INTO sandbox.null_insert VALUES (2, NULL, 0, '');
INSERT INTO sandbox.null_insert VALUES (3, 0, 0, 'не указан');
