/*
Defines routes for listing, creating, updating, and deleting events
*/

const expressLib = require('express');                                  //Import express framework
const { validAuth, validRole } = require('../middleware/auth.js');      //Import middleware authentication functions
const { validNum, validString, validDate} = require('../utils/validatorFunctions.js'); //Import validator functions from utils
const connPool = require('../dbHelper.js');

const expRouter = expressLib.Router();                                  //Router instance

// GET all venues
expRouter.get("/venues/all", async (req, res) => {
    console.log("HIT /api/events/venues/all");
    try {
        const [rows] = await connPool.query("SELECT venue_id, venue_name FROM Venue");
        res.json({ venues: rows });
    } catch (err) {
        console.error("Error fetching venues:", err);
        res.status(500).json({ message: "Server error loading venues." });
    }
});

//GET endpoint to list/search events at /api/events
expRouter.get('/', async(req, res) => {
    try{
        const { q, category, city, startDate, endDate, limit, offset } = req.query;   //Extra URL query string parameters
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

        baseQuery += ' ORDER BY e.start_time ASC LIMIT ? OFFSET ?';      //Order and paginate the query
        let lim = parseInt(limit);                              //Convert limit and offset to numbers
        let off = parseInt(offset);
        
        if (isNaN(lim) || lim <= 0) {                             //Defaults for limit and offset
            lim = 20;
        }
        if (isNaN(off) || off < 0) {
            off = 0;
        }

        queryParams.push(lim, off);                            //Push limit and offset to parameters

        const [queryRows] = await connPool.query(baseQuery, queryParams);   //Executes query parameters against the DB
        res.json({ events: queryRows});                                          //JSON of event rows sent back to client
    } catch (error){                                                    //Error handling
        console.error('GET /api/events error:', error);                 //Console logs error, responds with HTTP 500
        res.status(500).json({ error: 'Server error'});
    }
});

// GET /api/events/cities - return distinct cities
expRouter.get('/cities', async (req, res) => {
    try {
        const [rows] = await connPool.query(`
            SELECT DISTINCT city
            FROM Venue
            WHERE city IS NOT NULL AND city <> ''
            ORDER BY city ASC;
        `);

        res.json({ cities: rows.map(r => r.city) });
    } catch (err) {
        console.error("Error fetching cities:", err);
        res.status(500).json({ error: "Server error" });
    }
});

//POST endpoint for creating new events (must be logged in and must be 'Organizer')
expRouter.post('/', validAuth, validRole(['Organizer']), async (req, res) => {
    try {
        const orgID = req.session.user.id;

        // FIXED: match frontend field names
        const vID = req.body.venue_id;
        const title = req.body.title;
        const eventDesc = req.body.event_description;
        const startTime = req.body.start_time;
        const endTime = req.body.end_time;
        const stPrice = req.body.standard_price;
        const eventStatus = req.body.event_status || "Scheduled";

        const categories = req.body.categories || [];
        const performers = req.body.performers || [];

        // Validation
        if (!validString(title) || !vID || !validDate(startTime)) {
            return res.status(400).json({ error: 'Missing/invalid fields.' });
        }

        if (stPrice !== undefined && !validNum(Number(stPrice))) {
            return res.status(400).json({ error: 'Invalid price.' });
        }

        // Insert event
        const [newEvent] = await connPool.query(
            `INSERT INTO Event_ 
                (organizer_id, venue_id, title, event_description, start_time, end_time,
                 standard_price, event_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [orgID, vID, title, eventDesc || null, startTime, endTime || null, stPrice || 0.0, eventStatus]
        );

        const eID = newEvent.insertId;

        if (categories.length) {
            const categoryPairs = categories.map(cID => [eID, cID]);
            await connPool.query(
                `INSERT INTO Event_Category (event_id, category_id) VALUES ?`,
                [categoryPairs]
            );
        }

        if (performers.length) {
            const performerPairs = performers.map(pID => [eID, pID]);
            await connPool.query(
                `INSERT INTO Event_Performer (event_id, performer_id) VALUES ?`,
                [performerPairs]
            );
        }

        res.status(201).json({ message: 'Event successfully created', eID });

    } catch (error) {
        console.error('POST /api/events error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

//PUT endpoint for organizers to edit events
expRouter.put('/:id', validAuth, validRole(['Organizer']), async (req, res) => {
    const eID = parseInt(req.params.id);                                //Acquire and validate event_id
    if (!eID){
        return res.status(400).json({error:'Invalid event ID.'});
    }

    try{
        const orgID = req.session.user.id;     //Get the organizer uID from the current session object
        const [evOrgID] = await connPool.query('SELECT organizer_id FROM Event_ WHERE event_id = ?', [eID]);  //Check the event organizer_id for ownership
        if (evOrgID.length === 0){                                                 //Ensures the event exists in the first place
            return res.status(404).json({error:'Event not found'});            
        }
        if (evOrgID[0].organizer_id !== orgID){                             //Organizers can only edit events they own
                return res.status(403).json({error:'Forbidden'});
        };

        const {vID, title, eventDesc, startTime, endTime, stPrice, eventStatus} = req.body;     //Body fields to be updated
        const updateInfo = [];                                          //Used in buidling the SQL UPDATE statement
        const SQLParams = [];

        //For all the provided fields, add a column update and push the new value
        if (vID){
            updateInfo.push('venue_id=?');
            SQLParams.push(vID);
        }
        if (title){
            updateInfo.push('title=?');
            SQLParams.push(title);
        }
        if (eventDesc !== undefined){
            updateInfo.push('event_description=?');
            SQLParams.push(eventDesc);
        }
        if (startTime){
            updateInfo.push('start_time=?');
            SQLParams.push(startTime);
        }
        if (endTime){
            updateInfo.push('end_time=?');
            SQLParams.push(endTime);
        }
        if (stPrice !== undefined){
            updateInfo.push('standard_price=?');
            SQLParams.push(stPrice);
        }
        if (eventStatus){
            updateInfo.push('event_status=?');
            SQLParams.push(eventStatus);
        }

        if (updateInfo.length === 0){                                   //UPDATE query only runs if information is provided
            return res.status(400).json({error: 'No updates found.'});
        }

        SQLParams.push(eID);
        const updateStmt = `UPDATE Event_ SET ${updateInfo.join(', ')} WHERE event_id = ?`;     //Concatenates update information into one SQL statement
        await connPool.query(updateStmt, SQLParams);                                              //Executes update statement

        res.json({message:'Successful event update.'})                  //Sucess message
    } catch (error) {                                                   //Error handling and logging
        console.error('PUT /api/events/:id', error);
        res.status(500).json({error: 'Server error'});
    }
});

//DELETE endpoint for organizers to cancel events
expRouter.delete('/:id', validAuth, validRole(['Organizer']), async (req, res) => {
    const eID = parseInt(req.params.id);                                //Acquire and validate event_id
    if (!eID){
        return res.status(400).json({error: 'Invalid event id.'});
    }

    //Initial validation similar to previous endpoint
    try{
        const orgID = req.session.user.id;     //Get the organizer uID from the current session object
        const [evOrgID] = await connPool.query('SELECT organizer_id FROM Event_ WHERE event_id = ?', [eID]);    //Check the event organizer_id for ownership
        if (evOrgID.length === 0){                                                 //Ensures the event exists in the first place
            return res.status(404).json({error:'Event not found'});            
        }
        if (evOrgID[0].organizer_id !== orgID){                             //Organizers can only edit events they own
                return res.status(403).json({error:'Forbidden'});
        };

        await connPool.query('DELETE FROM Event_ WHERE event_id = ?', [eID]);       //Delete event
        res.json({message:'Event successfully cancelled.'});                //Success message

    } catch (error) {                                                       //Error handling and logging
        console.error('DELETE /api/events/:id error', error);
        res.status(500).json({ error:'Server error'});
    }
});

//Another GET endpoint for a single event at /api/events
expRouter.get('/:id', async (req, res) => {
    const eventID = parseInt(req.params.id);                            //Reads and converts the ID from the URL into an int
    if (!eventID){                                                      //Error handling
        return res.status(400).json({error: 'Invalid event ID'});
    }

    try{
        const [eventRows] = await connPool.query(                       //Query the DB for the event with the specified ID, joining the venue info
            `SELECT  e.*, v.venue_name, v.city, v.loc_address
            FROM Event_ e JOIN Venue v ON e.venue_id = v.venue_id
            WHERE e.event_id=?`, [eventID]                              //'?' ensures safe insertion
        );

        if (eventRows.length === 0){                                    //Error handling
            return res.status(404).json({error:'Event with specified ID not found'});
        }

        const event = eventRows[0];                                     //Select the first event record
        const [ticketCounts] = await connPool.query(                        //Counts how many tickets in each status category (available, reserved, etc.)
            `SELECT ticket_status, COUNT(*) AS tcount
            FROM Ticket WHERE event_id = ?
            GROUP BY ticket_status`, [eventID]
        );
        const [eventTickets] = await connPool.query(                    //Return a list of tickets for the specified event, along with seat details
            `SELECT t.ticket_id, t.seat_id, t.ticket_price, t.ticket_status,
                s.section_id, s.seat_number, s.row_num, sec.section_name
            FROM Ticket t 
            JOIN Seat s ON t.seat_id = s.seat_id
            LEFT JOIN Section sec ON s.section_id = sec.section_id
            WHERE t.event_id = ? LIMIT 300`, [eventID]
        );
        res.json({ event, ticketCounts, eventTickets });                //Send a JSON response with event, ticket count, and ticket list details
    } catch (error){                                                    //Handles and logs errors
        console.error('GET /api/events/:id error', error);
        res.status(500).json({error:'Server error'});
    }
});

module.exports = expRouter;                                                 //Export to let other files use it
