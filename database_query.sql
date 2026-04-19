show databases;

create database garbage;
use garbage;

CREATE TABLE garbage_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255),
    file_path TEXT,
    label VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

DESCRIBE garbage_images;

INSERT INTO garbage_images (file_name, file_path, label)
VALUES ('test.jpg', 'C:\\test\\test.jpg', 'plastic');


SELECT * FROM garbage_images;