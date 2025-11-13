/*
Creates and exports a MySQL connection pool, used to query DB efficiently
*/

const mysql = require('mysql2/promise');                //promise API to interact w/ MySQL DBs
require('dotenv').config()                              //import and configure .env file

const connPool = mysql.createPool({                     //start of connection pool
    host: process.env.DBHOST,                           //reads and stores .env values
    port: process.env.DBPORT,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME,
    waitForConnections: true,                           //pool waits for connections to free up if busy
    connectionLimit: 7,                                 //max simultaneous connections
    queueLimit: 30,                                     //how many max requests can be queued (while waiting for connection)
    decimalNumbers: true                                //converts returned strings to JS numbers for better handling
});

module.exports = connPool;                              //exports connPool to let other files use it