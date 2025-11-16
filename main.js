/*
Central file that connects routes, database connection, middleware, and configurations.
*/

const expressLib = require('express');                         //Express.js web framework
const sessionPkg = require('express-session');                 //Express-session package (manage user sessions)
const MySQLStore = require('express-mysql-session')(sessionPkg);   //MySQL Express session store, saves session data in MySQL DB
const parser = require('body-parser');                 //Middleware, lets Express read JSON, form data from requests
const cors = require('cors');                          //Lets backend API accept requests from frontend
const dotenv = require('dotenv');                      //Loads .env file (environment variables)

dotenv.config();                                     //Load environment variables

const dbHelper = require('./dbHelper');                 //Import DB connection from pool in dbHelper.js, letting routes query the DB

const mainApp = expressLib();                              //Initialize Express app, all routes/middleware/etc. connected to it

mainApp.use(cors({                                      //Connect to frontend using CORS
    origin: 'http://localhost:3000',                    //Frontend domain
    credentials: true                                   //Session cookies can be sent with requests
}));

mainApp.use(parser.json());                             //Parse JSON incoming into req.body
mainApp.use(parser.urlencoded({ extended: true}));      //Parse URL-encoded form data 

const sessionStore = new MySQLStore({}, dbHelper);   //Session store linked to MySQL DB (connection pool from dbHelper.js)

//Initialized session information
mainApp.use(sessionPkg({
    key: 'user_session',                                //Session cookie name
    secret: process.env.SESSIONSECRET,                  //Encrypts session ID, loaded from .env
    store: sessionStore,                                //Saves sessions in MySQL
    resave: false,                                      //If the session isn't modified, it isn't stored
    saveUninitialized: false,                           //Unauthenticated users don't have sessions created
    cookie: {                                           //Cookie settings
        maxAge: 86400,                                  //Valid for one day
        secure: false,                                  //True only when using HTTPS
        httpOnly: true                                  //Client-side JS can't access cookies
    }
}));

//DB connection tester
dbHelper.query('SELECT 1')
    .then(() => console.log('Successful connection.'))
    .catch(err => console.error('Connection failed.', err));

mainApp.use('/api/auth', require('./routes/auth.js'));                   //Mount all routes under /api
mainApp.use('/api/events', require('./routes/events.js'));
mainApp.use('/api/tickets', require('./routes/tickets.js'));
mainApp.use('/api/orders', require('./routes/orders.js'));
mainApp.use('/api/views', require('./routes/views.js'));

//Basic route for root URL, checks if server running
mainApp.get('/', (req, res) => {
    res.send('Backend check');
});

//Reads PORT from .env, starts the Express server, logs the runnning port
const PORT = process.env.PORT;
mainApp.listen(PORT, () => console.log(`Server running on port ${PORT}`));