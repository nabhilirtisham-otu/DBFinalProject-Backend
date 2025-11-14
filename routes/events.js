const expressLib = require('express');                                  //Import express framework
const dbHelper = require('../dbHelper.js');                             //Import DB connection
const { validAuth, validRole } = require('../middleware/auth.js');      //Import middleware authentication functions
const { validNum, validString, validDate} = require('../utils/validatorFunctions.js'); //Import validator functions from utils

const expRouter = expressLib.Router();                                  //Router instance

//GET endpoint to list/search events at /api/events
expRouter.get('/', async(req, res) => {
    try{
        const { q, category, city, startDate, endDate, limit, offset=0 } = req.query;   //Extra URL query string parameters
        const conditions = [];                                          //Stores WHERE clause conditions  
        const params = [];                                              //Stores actual parameter values

        if (q){
            conditions.push('(e.title LIKE ? OR e.event_description LIKE ?)');      //Add a condition matching the event title/description
            params.push(`%${q}%`, `%${q}%`);                                        //Partial matching wildcard pattern, added to parameters
        }
    }
})