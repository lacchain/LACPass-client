CREATE USER docker WITH PASSWORD 'password' CREATEDB;

CREATE DATABASE laccpass_client_development
WITH OWNER = docker
CONNECTION LIMIT = -1;

CREATE DATABASE laccpass_client
WITH OWNER = docker
CONNECTION LIMIT = -1;

