//Imports Express framework, DB connection, and authorization functions
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const { validAuth, validRole } = require('../middleware/auth.js');

const expRouter = expressLib.Router();                                  //Router instance