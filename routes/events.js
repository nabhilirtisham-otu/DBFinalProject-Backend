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
            return res.status(404).json({error:'Event with specified ID found'});
        }

        const event = eventRows[0];                                     //Select the first event record
        const [ticketCounts] = await connPool.query(                        //Counts how many tickets in each status category (available, reserved, etc.)
            `SELECT ticket_status, COUNT(*) AS tcount
            FROM Ticket WHERE event_id = ?
            GROUP BY ticket_status`, [eventID]
        );
        const [eventTickets] = await connPool.query(                    //Return a list of tickets for the specified event, along with seat details
            `SELECT t.ticket_id, t.seat_id, t.ticket_price, t.ticket_status,
                s.section_id, s.seat_number, s.row_num
            FROM Ticket t JOIN Seat s ON t.seat_id = s.seat_id
            WHERE t.event_id = ? LIMIT 300`, [eventID]
        );
        res.json({ event, ticketCounts, eventTickets });                //Send a JSON response with event, ticket count, and ticket list details
    } catch (error){                                                    //Handles and logs errors
        console.error('GET /api/events/:id error', error);
        res.status(500).json({error:'Server error'});
    }
});

//POST endpoint for creating new events (must be logged in and must be 'Organizer')
expRouter.post('/', validAuth, validRole(['Organizer']), async (req, res) => {
    try{
        const orgID = req.session.user.users_id || req.session.user.id;     //Get the organizer uID from the current session object
        const { vID, title, eventDesc, startTime, endTime,
            standardPrice, categories = [], performers = []} = req.body;    //Get event details from the body of the POST request
    
        //Error handling for event details
        if (!validString(title) || !vID || !validDate(startTime)){
            return res.status(400).json({error: 'Missing/invalid fields.'});
        }
        if (standardPrice !== undefined && !validNum(Number(standardPrice))){
            return res.status(400).json({error: 'Invalid price.'});
        }

        const [newEvent] = await pool.query(                                //Insert a new row into Event_ with all the information provided above
            `INSERT INTO Event_ (organizer_id, venue_id, title, event_description, start_time, end_time,
                standard_price, event_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
            [orgID, vID, title, eventDesc || null, startTime, endTime || null, standardPrice || 0.0]    //null handles missing (optional) information
        );

        const eID = newEvent.insertId;                                  //Return the auto-incremented ID of the new event

        if (Array.isArray(categories) && categories.length) {           //For any category IDs provided, insert them into Event_Categories with the associated event
            const categoryPairs = categories.map(cID => [eID, cID]);
            await connPool.query(`INSERT INTO Event_Category (event_id, category_id)
                VALUES ?`, [categoryPairs]);
        }
        if (Array.isArray(performers) && performers.length) {           //Same as above but for the performers array
            const performerPairs = performers.map(pID => [eID, pID]);
            await connPool.query(`INSERT INTO Event_Performer (event_id, performer_id)
                VALUES ?`, [performerPairs]);
        }

        res.status(201).json({message: 'Event successfully created', eID});     //Returns success message and event ID
    } catch (error){
        console.error('POST /api/events error', err);
        res.status(500).json({error: 'Server error'});
    }
});