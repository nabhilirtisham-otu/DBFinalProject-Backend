/*
CSV and PDF export routes
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

//PDF export route
expRouter.get("/events.pdf", async (req, res) => {
    try{
        const eventRows = await fetchEvents();              //Retrieve event data
        res.setHeader("Content-Type", "application/pdf");          //Set expected response type to CSV
        res.setHeader("Content-Disposition", `attachment; filename="events.pdf"`);          //Instruct browser to download file events.csv

        const pdfDoc = new PDFDocument({margin: 40, size: "A4"});           //Create PDF doc with specified page formatting
        pdfDoc.pipe(res);                       //Stream PDF output to HTTP response

        pdfDoc.fontSize(18).text("Event List", {align: "center"});          //Draw header
        pdfDoc.moveDown(0.5);                   //Move cursor down half a line
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, {align:"center"});       //Show export timestamp
        doc.moveDown(1);                        //Move cursor down full line (create spacing)

        const tableHead = pdfDoc.y;             //Store Y position where table start
        pdfDoc.fontSize(10).text("ID", 40, tableHead);          //Write column headers at fixed X-positions
        pdfDoc.text("Title", 80, tableHead);
        pdfDoc.text("Venue (City)", 240, tableHead);
        pdfDoc.text("Start", 340, tableHead);
        pdfDoc.text("Price", 420, tableHead);

        pdfDoc.moveDown();                      //Move cursor down (create spacing)

        eventRows.forEach((row) => {            //For every event
            pdfDoc.moveDown(0.2);               //Add spacing between rows
            pdfDoc.fontSize(10).text(String(row.event_id), 40, pdfDoc.y);           //Write event ID
            pdfDoc.text(row.title || "", 80, pdfDoc.y, {width: 160, continued: false });        //Write event title in the Title column
            pdfDoc.text(`${row.venue_name || ""} (${row.city || ""})`, 240, pdfDoc.y, {width: 100});        //Write venue and city together
            const startTime = row.start_time ? (new Date(row.start_time)).toLocaleString() : "";         //Format start time for readability
            pdfDoc.text(startTime, 340, pdfDoc.y, {width: 80});             //Write start date
            pdfDoc.text(row.standard_price != null ? row.standard_price.toFixed(2) : "", 420, pdfDoc.y, {width: 60});       //Write price formatted as number with 2 decimals
        });
        pdfDoc.end();
    } catch (error) {                           //Error handling and logging
        console.error("GET /api/export/events.pdf error", error);
        res.status(500).json({error: "Server error generating PDF"});
    }
});

module.exports = expRouter;                     //Export router to let other files use it