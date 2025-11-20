# DBFinalProject-Backend

This is the backend for our database final project TickIt, built with Node.js, Express.js, and MySQL.

## Repository Layout
- `middleware/auth.js` - Authentication and authorization logic
- `routes/` - REST API routes (GET, PUT, DELETE, POST) for different entities 
- `utils/validatorFunctions.js/` - Functions sanitizing inputs
- `dbHelper.js` - Creates and exports a MySQL connection pool
- `main.js` - Connects routes, database connection, middleware, and configurations
- `sample_data.sql` - Holds sample data inserted into all tables before runtime
- `tables.sql` - Holds all entities used in the application
- `views.sql` - Structures and creates all views provided in the application

## Requirements
- Git for cloning repository
- Node.js 18+ and npm
- MySQL 8.x (local or remote) with a user that can create tables/views
- OpenWeatherMap API key (used by weather route)

## Required Libraries and Assets
- express, cors, dotenv, helmet
- express-session, express-mysql-session, cookie-parser
- mysql2, bcrypt, uuid
- pdfkit
- dev: nodemon

## Setup Instructions
- Clone this repo into a new folder.
- Create a `.env` file in the project root (same level as `main.js`).
- `npm install` will create `node_modules/` automatically; no other generated folders are required.

## Environment variables (.env)
```
PORT=3000
DBHOST=localhost
DBPORT=3306
DBUSER=your_mysql_user
DBPASS=your_mysql_password
DBNAME=event_db
SESSIONSECRET=some_long_random_string
OPENWEATHERAPIKEY=your_openweather_api_key
```

## Database setup
1) Create the database: `CREATE DATABASE event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2) Load schema: `mysql -u <user> -p event_db < tables.sql`
3) Load sample data: `mysql -u <user> -p event_db < sample_data.sql`
4) Create views (if not already included): `mysql -u <user> -p event_db < views.sql`

## Install & run
1) Install dependencies: `npm install`
2) Start in dev mode with reload: `npm run dev`
3) Start normally: `npm start`