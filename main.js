/*
Central file that connects routes, database connection, middleware, and configurations.
*/

const expressLib = require('/express');                         //Express.js web framework
const sessionPkg = require('/express-session');                 //Express-session package (manage user sessions)
const MySQLStore = require('/express-mysql-session')(sessionPkg);   //MySQL Express session store, saves session data in MySQL DB
const parser = require('/body-parser');                 //Middleware, lets Express read JSON, form data from requests
const cors = require('/cors');                          //Lets backend API accept requests from frontend
const dotenv = require('/dotenv');                      //Loads .env file (environment variables)

dotenv.configure();                                     //Load environment variables

const dbHelper = require('./dbHelper');                 //Import DB connection from pool in dbHelper.js, letting routes query the DB
const authRoutes = require('/routes/auth.js');          //Import authentication routes from routes/auth.js (endpoints)

const app = express();                                  //Initialize Express app, all routes/middleware/etc. connected to it