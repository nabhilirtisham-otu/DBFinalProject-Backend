/*
Defines routes for listing, creating, updating, and deleting tickets
*/

//Imports Express framework, DB connection, authorization functions, and a validator function
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const { validAuth, validRole } = require('../middleware/auth.js');
const {validNum} = require('../utils/validatorFunctions.js');

const expRouter = expressLib.Router();              //Instantiates new Express router

//Ensures a venue has a default section and seats (A-Z rows, 10 seats each) so organizers can list tickets
async function ensureVenueSeats(venueId) {
    const [seatCountRows] = await connPool.query(
        `
        SELECT COUNT(*) AS seatCount
        FROM Seat s
        JOIN Section sec ON s.section_id = sec.section_id
        WHERE sec.venue_id = ?
        `,
        [venueId]
    );

    if (seatCountRows[0].seatCount > 0) {
        return;
    }

    let sectionId;
    const [existingSection] = await connPool.query(
        'SELECT section_id FROM Section WHERE venue_id = ? LIMIT 1',
        [venueId]
    );

    if (existingSection.length) {
        sectionId = existingSection[0].section_id;
    } else {
        const [newSection] = await connPool.query(
            'INSERT INTO Section (venue_id, section_name, seating_capacity) VALUES (?, ?, ?)',
            [venueId, 'Auto Generated', 260]
        );
        sectionId = newSection.insertId;
    }

    const seatValues = [];
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const row of rows) {
        for (let num = 1; num <= 10; num++) {
            seatValues.push([sectionId, `${row}${num}`, row]);
        }
    }

    await connPool.query(
        'INSERT INTO Seat (section_id, seat_number, row_num) VALUES ?',
        [seatValues]
    );
}

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

        let filterStmt = `SELECT t.ticket_id, t.event_id, t.seat_id, t.ticket_price, t.ticket_status, s.row_num, s.seat_number, sec.section_name
        FROM Ticket t
        JOIN Seat s ON t.seat_id = s.seat_id
        JOIN Section sec ON s.section_id = sec.section_id`;    //Returns ticket, seat, and section information

        if (filterInfo.length){                             //Adds any filter conditions to the SQL statement
            filterStmt += ' WHERE ' + filterInfo.join(' AND ');
        }

        filterStmt += ' ORDER BY t.ticket_id LIMIT ? OFFSET ?'; //Sets SQL statement to order by ticket and adds offset and limit
        
        let lim = parseInt(limit);                              //Convert limit and offset to numbers
        let off = parseInt(offset);
        
        if (isNaN(lim) || lim <= 0) {                             //Defaults for limit and offset
            lim = 20;
        }
        if (isNaN(off) || off < 0) {
            off = 0;
        }

        filterParams.push(lim, off);                            //Push limit and offset to parameters

        const [ticketRows] = await connPool.query(filterStmt, filterParams);    //Execute SQL query with parameters
        res.json({ tickets: ticketRows});                       //Return results as JSON

    } catch (error) {                                           //Error handling and logging
        console.error('GET /api/tickets error', error);
        res.status(500).json({ error: 'Server error'});
    }
});

//POST endpoint for creating ticket listing (only organizers)
expRouter.post('/', validAuth, validRole(['Organizer']), async (req, res) => {
    try{
        const oID = req.session.user.id;
        const eID = Number(req.body.eID ?? req.body.eventId ?? req.body.event_id);
        const seatLabel = req.body.seatNumber ?? req.body.seatLabel ?? req.body.seat ?? req.body.seat_id;
        const tPrice = req.body.tPrice ?? req.body.ticketPrice ?? req.body.ticket_price;
        const numericPrice = Number(tPrice);

        if (!eID || !seatLabel || !validNum(numericPrice)) {
            return res.status(400).json({error: 'Invalid information.'});
        }

        const [eventRows] = await connPool.query(
            'SELECT venue_id FROM Event_ WHERE event_id = ? AND organizer_id = ?',
            [eID, oID]
        );
        if (eventRows.length === 0){
            return res.status(404).json({error: 'Event not found for organizer.'});
        }

        await ensureVenueSeats(eventRows[0].venue_id);

        const parts = seatLabel.split('-').map(part => part.trim()).filter(Boolean);
        let seatNumber, seatRow;
        if (parts.length === 2){
            [seatRow, seatNumber] = parts;
        } else if (parts.length === 1){
            seatNumber = parts[0];
        } else {
            return res.status(400).json({error: 'Invalid seat format. Use Row-SeatNumber (e.g., A-A1).'});
        }

        const seatQuery = `
            SELECT s.seat_id
            FROM Seat s
            JOIN Section sec ON s.section_id = sec.section_id
            WHERE sec.venue_id = ?
              AND s.seat_number = ?
              ${seatRow ? 'AND s.row_num = ?' : ''}
        `;
        const seatParams = [eventRows[0].venue_id, seatNumber];
        if (seatRow){
            seatParams.push(seatRow);
        }
        const [seatRows] = await connPool.query(seatQuery, seatParams);
        if (seatRows.length === 0){
            return res.status(400).json({error: 'Seat not found for this venue.'});
        }
        if (!seatRow && seatRows.length > 1){
            return res.status(400).json({error: 'Seat identifier ambiguous. Include row (e.g., A-A1).'});
        }
        const sID = seatRows[0].seat_id;

        try {                                                           //INSERT a new ticket into the DB
            const [insertTicket] = await connPool.query(
                `INSERT INTO Ticket (event_id, seat_id, ticket_price, ticket_status)
                VALUES (?, ?, ?, 'Available')`,
                [eID, sID, numericPrice]
            );

            return res.status(201).json({message: 'Ticket successfully created.', ticketID: insertTicket.insertId});  //Success message, returning ticketID
        } catch (error) {                                               //Duplicate ticket error handling
            if (error && error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({error:'Seat already listed for event.'});
            }
            throw error;                                                //If error isn't a duplicate ticket error, throw an error
        }
    } catch (error) {                                                   //Error handling and logging
        console.error('POST /api/tickets/error', error);
        res.status(500).json({error: 'Server error'});
    }
});

//GET available seats for an event's venue (organizer only)
expRouter.get('/available-seats', validAuth, validRole(['Organizer']), async (req, res) => {
    try {
        const oID = req.session.user.id;
        const eID = Number(req.query.eID ?? req.query.eventId ?? req.query.event_id);

        if (!eID) {
            return res.status(400).json({ error: 'Event id required.' });
        }

        const [eventRows] = await connPool.query(
            'SELECT venue_id FROM Event_ WHERE event_id = ? AND organizer_id = ?',
            [eID, oID]
        );

        if (eventRows.length === 0) {
            return res.status(404).json({ error: 'Event not found for organizer.' });
        }

        await ensureVenueSeats(eventRows[0].venue_id);

        const [seatRows] = await connPool.query(
            `
            SELECT s.seat_id, s.row_num, s.seat_number, sec.section_name
            FROM Seat s
            JOIN Section sec ON s.section_id = sec.section_id
            WHERE sec.venue_id = ?
              AND s.seat_id NOT IN (
                SELECT seat_id FROM Ticket WHERE event_id = ?
              )
            ORDER BY s.row_num, s.seat_number
            `,
            [eventRows[0].venue_id, eID]
        );

        const seats = seatRows.map(seat => ({
            seat_id: seat.seat_id,
            row_num: seat.row_num,
            seat_number: seat.seat_number,
            section_name: seat.section_name,
            seat_label: seat.row_num ? `${seat.row_num}-${seat.seat_number}` : seat.seat_number
        }));

        res.json({ seats });
    } catch (error) {
        console.error('GET /api/tickets/available-seats error', error);
        res.status(500).json({ error: 'Server error' });
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
        return res.status(400).json({error: 'Invalid ticket ID.'});
    }

    try{
        await connPool.query('DELETE FROM Ticket WHERE ticket_id = ?', [tID]);
        res.json({message: 'Ticket deleted successfully.'});
    } catch (error) {                                                   //Error handling and logging
        console.error('DELETE /api/tickets/:id error', error);
        res.status(500).json({error: 'Server error'});
    }
});

module.exports = expRouter;                                             //Export to let other files use it
