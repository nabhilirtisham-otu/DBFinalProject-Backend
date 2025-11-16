//Imports Express framework, DB connection, and authorization functions
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const { validAuth, validRole } = require('../middleware/auth.js');
const e = require('express');

const expRouter = expressLib.Router();                                  //Router instance

//GET endpoint to retrieve events for a logged-in organizer
expRouter.get("/", validAuth, validRole(["Organizer"]), async (req, res) => {
    const oID = req.session.user.id;                                    //Read organizer (user) id from current session
    try {
        const [eventRows] = await connPool.query(                       //Return venue and event information belonging to current organizer
            `SELECT e.*, v.city, v.venue_name
            FROM Event_ e
            JOIN Venue v ON e.venue_id = v.venue_id
            WHERE e.organizer_id = ?`,
            [oID]
        );
        res.json({events: eventRows});                                  //Send event information as a JSON
    } catch (error){
        console.error("GET /organizer/events error", error);            //Error handling and logging
        res.status(500).json({ error: "Server error occured."});
    }
});

expRouter.post("/", validAuth. validRole(["Organizer"]), async (req, res) => {
    try{
        const oID = req.session.user.id;                                    //Read organizer (user) id from current session
        const {vID, title, eDesc, stTime, endTime, stPrice, eStatus} = req.body;    //Expected fields in the request body

        const [eventInsert] = await connPool.query(                         //INSERT event row information into DB
            `INSERT INTO Event_ (organizer_id, venue_id, title, event_description, start_time, end_time, standard_price, event_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [oID, vID, title, eDesc, stTime, endTime, stPrice, eStatus]
        );

        res.status(201).json({message:"Event created successfully.", eventId: insert.insertId});    //Success message and new eventId
    } catch (error){                                                        //Error handling and logging
        console.error("POST /organizer/events", error);
        res.status(500).json({error:"Server error"});
    }
});