/*
Defines routes for listing, creating, updating, and deleting tickets
*/

//Imports Express framework, DB connection, authorization functions, and a validator function
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const { validAuth, validRole } = require('../middleware/auth.js');
const {validNum} = require('../utils/validatorFunctions.js');

const expRouter = expressLib.Router();              //Instantiates new Express router

//GET endpoint for public ticket listing
expRouter.get('/', async (req, res) => {
    try{
        const { eID, status, limit, offset} = req.query;        //Read URL query parameters
        const filterInfo = [];                                  //Used in SQL filtering
        const filterParams = [];

        if (eID){                                               //Add SQL condition if filtering by event
            filterInfo.push('t.event_id=?');
            filterParams.push(eID);
        }
        if (status){                                            //Add SQL condition if filtering by ticket status
            filterInfo.push('t.ticket_status=?');
            filterParams.push(status);
        }

        let filterStmt = `SELECT t.ticket_id, t.event_id, t.seat_id, t.ticket_price, t.ticket_status, s.row_num, s.seat_number
        FROM Ticket t JOIN Seat s ON t.seat_id = s.seat_id`;    //Returns ticket and row information

        if (filterInfo.conditions){                             //Adds any filter conditions to the SQL statement
            filterStmt += ' WHERE ' + filterInfo.join(' AND ');
        }

        filterStmt += ' ORDER BY t.ticket_id LIMIT ? OFFSET ?'; //Sets SQL statement to order by ticket and adds offset and limit
        filterParams.push(parseInt(limit), parseInt(offset));

        const [ticketRows] = await connPool.query(filterStmt, filterParams);    //Execute SQL query with parameters
        res.json({ tickets: ticketRows});                       //Return results as JSON

    } catch (error) {                                           //Error handling and logging
        console.error('GET /api/tickets error', error);
        res.status(500).json({ error: 'Server error'});
    }
});