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

//POST endpoint for creating ticket listing (only organizers)
expRouter.post('/', validAuth, validRole(['Organizer']), async (req, rest) => {
    try{
        const { eID, sID, tPrice } = req.body;                      //Read POST request JSON body information
        
        //Error handling
        if (!eID || !sID || !validNum(Number(tPrice))) {
            return res.status(400).json({error: 'Invalid information.'});
        }

        try {                                                           //INSERT a new ticket into the DB
            const [insertTicket] = await connPool.query(
                `INSER INTO Ticket (event_id, seat_id, ticket_price, ticket_status)
                VALUES (?, ?, ?, 'Available)`,
                [eID, sID, tPrice]
            );

            return res.status(201).json({message: 'Ticket successfully created.', ticketID: result.insertID});  //Success message, returning ticketID
        } catch (error) {                                               //Duplicate ticket error handling
            if (error && err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({error:'Seat already lsited for event.'});
            }
            throw error;                                                //If error isn't a duplicate ticket error, throw an error
        }
    } catch (error) {                                                   //Error handling and logging
        console.error('POST /api/tickets/error', error);
        res.status(500).json({error: 'Server error'});
    }
});

//PUT endpoint for updating ticket information (only organizers)
expRouter.put('/:id', validAuth, validRole(['Organizer']), async (req, res) => {
    const tID = parseInt(req.params.id);                                //Retrieve ticket ID and perform error handling
    if (!tID){
        return res.status(400).json({error: 'Invalid ticket ID.'});
    }
    
    try {
        const {tPrice, tStatus} = req.body;                             //Read fields to be updated from the request body
        const updateInfo = [];                                          //Arrays used in SQL updates
        const updateParams = [];

        //Update the ticket price if provided and valid
        if (tPrice !== undefined) {
            if (!validNum(Number(tPrice))){
                return res.status(400).json({error: 'Invalid price.'});
            }
            updateInfo.push('ticket_price=?');
            updateParams.push(tPrice);
        }

        if (tStatus) {                                                  //Update the ticket status if provided
            updateInfo.push('ticket_status=?')
            updateParams.push(tStatus);
        }

        if (updateParams.length === 0){                                 //Ensure update information is provided in the first place
            return res.status(400).json({error: 'No update information provided.'});
        }
        
        updateParams.push(tID);
        await connPool.query(`UPDATE Ticket SET ${updateInfo.join(', ')} WHERE ticket_id = ?`, updateParams);   //Execute SQL UPDATE statement
        res.json({message: 'Ticket updated successfully.'});
    } catch (error) {                                                   //Error handling and logging
        console.error('PUT /api/tickets/:id error', error);
        res.status(500).json({error: 'Server error'});
    }
});

//DELETE endpoint for deleting tickets (only organizers)
expRouter.delete('/:id', validAuth, validRole(['Organizer']), async (req, res) => {
    const tID = parseInt(req.params.id);                                //Retrieve ticket ID and perform error handling
    if (!tID){
        return res.status(400).({error: 'Invalid ticket ID.'});
    }

    try{
        await connPool.query('DELETE FROM Ticket WHERE ticket_id = ?', [tID]);
        res.json({message: 'Ticket deleted successfully.'});
    } catch (error) {                                                   //Error handling and logging
        console.error('DELETE /api/tickets/:id error', errro);
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = expRouter;                                             //Export to let other files use it