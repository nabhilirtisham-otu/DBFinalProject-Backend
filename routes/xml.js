/*
Return event data in XML format
*/

//Imports Express framework, DB connection, and authorization functions
const expressLib = require('express');
const connPool = require('../dbHelper.js');

const expRouter = expressLib.Router();              //Create express router instance

//GET endpoint for exporting data as XML file
expRouter.get("/events", async (req, res) => {
    try{
        const [evVenRows] = await connPool.query(           //Return event and venue information from DB, ordered chronologically
            `SELECT e.event_id, e.title, e.event_description, e.start_time, e.end_time, e.standard_price, e.event_status,
                v.venue_name, v.city
            FROM Event_ e
            LEFT JOIN Venue v ON e.venue_id = v.venue_id
            ORDER BY e.start_time ASC`
        );

        let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n<events>\n`;       //Initialized XML string
        for (const row of evVenRows) {                  //Iterate over every event row
            xmlString += `  <event>\n`;             //Add an <event> element for every row
            xmlString += `      <id>${row.event_id}</id>\n`;                    //Insert event_id
            xmlString += `      <title>${escapeXml(row.title)}</title>\n`;                    //Insert event title, escapeXML() to prevent formatting error
            xmlString += `      <venue>${escapeXml(row.venue_name)}</venue>\n`;                    //Insert event venue, escapeXML() to prevent formatting error
            xmlString += `      <city>${escapeXml(row.city)}</city>\n`;                    //Insert event city, escapeXML() to prevent formatting error
            xmlString += `      <id>${row.event_id}</id>\n`;                    //Add <id> element with the event_id
            xmlString += `      <start_time>${row.start_time ? row.start_time.toISOString?.() ?? row.start_time : ""}</start_time>\n`;      //If start time isn't null and is a Date object, convert to ISO string (or fallback), or output empty string
            xmlString += `      <end_time>${row.end_time ? row.end_time.toISOString?.() ?? row.end_time : ""}</end_time>\n`;      //Same as above but for end time
            xmlString += `  </event>\n`;             //Close <event>
        }
        xmlString += `</events>`;               //Close root XML tag

        res.setHeader("Content-Type", "application/xml");               //Set expected response type to XML
        res.send(xmlString);                    //Send XML string in HTTP response body
    } catch (error) {                           //Error handling and logging
        console.error("GET /api/xml/events error", error);
        res.status(500).send(`<error>Server error</error>`);
    }
});

function escapeXml(text){
    if (text == null) return "";                //null/undefined text replaced with empty
    return String(text)                         //Convert unsafe text to string
        .replace(/&/g, "&amp;")                 //Replace XML-reserved characters
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

module.exports = expRouter;                     //Export router to let other files use it