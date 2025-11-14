const expressLib = require('express');                                  //Import express framework
const dbHelper = require('../dbHelper.js');                             //Import DB connection
const { validAuth, validRole } = require('../middleware/auth.js');      //Import middleware authentication functions
const { validNum, validString, validDate} = require('../utils/validatorFunctions.js'); //Import validator functions from utils
const { param } = require('./auth.js');
const connPool = require('../dbHelper.js');

const expRouter = expressLib.Router();                                  //Router instance

//GET endpoint to list/search events at /api/events
expRouter.get('/', async(req, res) => {
    try{
        const { q, category, city, startDate, endDate, limit, offset=0 } = req.query;   //Extra URL query string parameters
        const queryConditions = [];                                     //Stores WHERE clause conditions  
        const queryParams = [];                                         //Stores actual parameter values

        if (q){
            queryConditions.push('(e.title LIKE ? OR e.event_description LIKE ?)');     //Add a condition matching the event title/description
            queryParams.push(`%${q}%`, `%${q}%`);                                       //Partial matching wildcard pattern, added to parameters
        }
        if (city){
            queryConditions.push('v.city = ?');                         //Filter events by venue city
            queryParams.push(city);
        }
        if (startDate){
            queryConditions.push('e.start_time >= ?');                  //Filter events by start-end date range
            queryParams.push(startDate);
        }
        if (endDate){
            queryConditions.push('e.start_time <= ?');
            queryParams.push(endDate);
        }

        //Retrieves event details and venue info, allowing filtering by category
        let baseQuery = `
            SELECT DISTINCT e.event_id, e.title, e.start_time, e.end_time, e.standard_price,
                e.event_status, v.venue_name, v.city
            FROM Event_ e
            JOIN Venue v ON e.venue_id = v.venue_id
            LEFT JOIN Event_Category ec ON e.event_id = ec.event_id
            LEFT JOIN Category c ON ec.category_id = c.category_id
        `;

        if (category){                                                  //Filter events by category ID
            queryConditions.push('c.category_id = ?');
            queryParams.push(category);
        }

        if (queryConditions.length){
            baseQuery += ' WHERE ' + queryConditions.join( ' AND ');    //Concatenate filters in queryConditions into baseQuery's WHERE clause
        }

        baseQuery += ' ORDER BY e.start_time ASC LIMIT ? OFFSET?';      //Order and paginate the query
        queryParams.push(parseInt(limit), parseInt(offset));            //Push the provided limit and offset value in the parameters array

        const [queryRows] = await connPool.query(baseQuery, queryParams);   //Executes query parameters against the DB
        res.json({ events: rows});                                          //JSON of event rows sent back to client
    } catch (error){                                                    //Error handling
        console.error('GET /api/events error:', error);                 //Console logs error, responds with HTTP 500
        res.status(500)({ error: 'Server error'});
    }
});