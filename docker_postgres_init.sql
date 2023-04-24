CREATE USER docker WITH PASSWORD 'password' CREATEDB;

CREATE DATABASE laccpass_orchestrator_development
WITH OWNER = docker
CONNECTION LIMIT = -1;

CREATE DATABASE laccpass_orchestrator
WITH OWNER = docker
CONNECTION LIMIT = -1;

