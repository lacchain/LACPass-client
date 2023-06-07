CREATE USER docker WITH PASSWORD 'password' CREATEDB;

CREATE DATABASE lacpass_client_development
WITH OWNER = docker
CONNECTION LIMIT = -1;

CREATE DATABASE lacpass_client
WITH OWNER = docker
CONNECTION LIMIT = -1;

