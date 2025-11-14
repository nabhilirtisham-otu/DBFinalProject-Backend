/*
Defines routes for listing, creating, updating, and deleting tickets
*/


//Imports Express framework, DB connection, authorization functions, and a validator function
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const { validAuth, validRole } = require('../middleware/auth.js');
const {validNum} = require('../utils/validatorFunctions.js');

const expRouter = expressLib.Router();              //Instantiates new Express router

