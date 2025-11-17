/*

*/

//Imports Express framework, DB connection, and authorization functions
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const pdfkitLib = require("pdfkit");

const expRouter = expressLib.Router();              //Instantiates new Express router

//Retrieve event and venue data
async function fetchEvents() {
    const [evVenRows] = await connPool.query(              //Select event detail, join related venue, in chronologically ascending order
        `SELECT e.event_id, e.title, e.event_description, e.start_time, e.end_time, e.standard_price, e.event_status,
            v.venue_name, v.city
        FROM Event_ e
        LEFT JOIN Venue v ON e.venue_id = v.venue_id
        ORDER BY e.start_time ASC`
    );
    return evVenRows;                               //Return array holding info above
}

//CSV export route
expRouter.get("events.csv", async (req, res) => {
    try {
        const eventRows = await fetchEvents();              //Load event data from DB using fetchEvents() function
        res.setHeader("Content-Type", "text/csv");          //Set expected response type to CSV
        res.setHeader("Content-Disposition", `attachment; filename="events.csv"`);          //Instruct browser to download file events.csv

        res.write(`event_id,title,venue,city,start_time,end_time,price,status\n`);          //CSV column names of first line of file
        for (const row of eventRows) {                        //Wrap values in quotes, with double quotes wrapped using excape quotes following CSV rules
            const safeEscape = (s) => {
                if (s === null || s === undefined) return "";
                return `"${String(s).replace(/"/g, '""')}"`;
            };
            const csvLine = [                                  //Build complete CSV row
                row.event_id,
                safeEscape(row.title),                            //Use safeEscape() function defined above
                safeEscape(row.venue_name),
                safeEscape(row.city),
                row.start_time ? row.start_time.toISOString?.() ?? row.start_time :"",          //ISO timestamps for datetimes, ?? so nulls don't breaking formatting
                row.end_time ? row.end_time.toISOString?.() ?? row.end_time :"",
                row.standard_price ?? "",
                row.event_status ?? ""
            ].join(",");
            res.write(csvLine + "\n");                          //Write csvLine to HTTP response stream
        }
        res.end();                              //End CSV response stream (finish file)
    } catch (error) {                           //Error handling and logging
        console.error("GET /api/export/events.csv error", error);
        res.status(500).json({error: "Server error in generating CSV export file."});
    }
});