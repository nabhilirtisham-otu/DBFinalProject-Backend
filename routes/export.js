/*

*/

//Imports Express framework, DB connection, and authorization functions
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const pdfkitLib = require("pdfkit");

const expRouter = expressLib.Router();              //Instantiates new Express router

//Retrieve event and venue data
async function fetchEvents() {
    const [evvenRows] = await connPool.query(              //Select event detail, join related venue, in chronologically ascending order
        `SELECT e.event_id, e.title, e.event_description, e.start_time, e.end_time, e.standard_price, e.event_status,
            v.venue_name, v.city
        FROM Event_ e
        LEFT JOIN Venue v ON e.venue_id = v.venue_id
        ORDER BY e.start_time ASC`
    );
    return evvenRows;                               //Return array holding info above
}

//CSV export route
expRouter.get("events.csv", async (req, res) => {
    try {
        const eventRows = await fetchEvents();              //Load event data from DB using fetchEvents() function
        res.setHeader("Content-Type", "text/csv");          //Set expected response type to CSV
        res.setHeader("Content-Disposition", `attachment; filename="events.csv"`);          //Instruct browser to download file events.csv

        res.write(`event_id,title,venue,city,start_time,end_time,price,status\n`);          //CSV column names of first line of file
        for (const r of eventRows) {
            
        }
    }
})