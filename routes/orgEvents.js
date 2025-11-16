/*
Organizer CRUD route for events
*/

//Imports Express framework, DB connection, and authorization functions
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const { validAuth, validRole } = require('../middleware/auth.js');
const e = require('express');
const { param } = require('./auth.js');

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

//POST endpoint to create events
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

//GET endpoint to retrieve single events
expRouter.get("/:id", validAuth, validRole(["Organizer"]), async (req, res) => {
    try {
        const eID = req.params.id;                                          //Get current organizer and event IDs
        const oID = req.session.user.id;

        const [eventRows] = await pool.query(                               //Organizers can only retrieve their own events
            `SELECT * FROM Event_ WHERE event_id = ? AND organizer_id = ?`,
            [eID, oID]
        );

        if (eventRows.length === 0){                                        //Error message if event not found
            return res.status(404).json({error:"Event information not found."});
        }
        res.json({evemt:eventRows[0]});                                     //Return event object
    } catch (error){                                                        //Error handling and logging
        console.error("GET /organizer/events/:id error", error);
        res.status(500).json({error:"Server error"});
    }
});

//PUT endpoint to update an event
expRouter.put("/:id", validAuth, validRole(["Organizer"]), async (req, res) => {
    try{
        const eID = req.params.id;                                          //Get event and organizer IDs
        const oID = req.session.user.id;

        const updateFields = [];                                            //Fields and values used to define dynamic SQL statement
        const updateParams = [];

        for (const [key, value] of Object.entries(req.body)) {              //Loop through keys/values in request body, pushes column and parameter values
            updateFields.push(`${key} = ?`);
            updateParams.push(value);
        }

        updateParams.push(eID, oID);                                        //Add event and organizer IDs to parameters

        await connPool.query(                                               //Execute UPDATE statement
            `UPDATE Event_ SET ${updateFields.join(", ")}
            WHERE event_id = ? AND organizer_id = ?`,
            updateParams
        );
        res.json({message: "Event updated successfully."});                 //Success message
    } catch (error){                                                        //Error handling and logging
        console.error("PUT /organizer/events/:id", error);
        res.status(500).json({error:"Server error"});
    }
});

//DELETE endpoint to delete an event
expRouter.delete("/:id", validAuth, validRole(["Organizer"]), async (req, res) => {
    const eID = req.params.id;
    const oID = req.session.user.id;

    try{
        await connPool.query(                                                   //Execute DELETE statement if the event belongs to the organizer
            `DELETE FROM Event_
            WHERE event_id = ? AND organizer_id = ?,`
            [eID, oID]
        );
        res.json({message:"Event deleted successfully."});                      //Success message
    } catch (error) {
        console.error("DELETE /organizer/events/:id", error);                   //Error handling and logging
        res.status(500).json({error:"Server error"});
    }
});

module.exports = expRouter;                                                     //Export router so other files can use it