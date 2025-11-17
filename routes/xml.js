// routes/xml.js
/*
Return event data in XML format
*/

const expressLib = require("express");
const connPool = require("../dbHelper.js");

const expRouter = expressLib.Router();

expRouter.get("/events", async (req, res) => {
    try {
        const [evVenRows] = await connPool.query(
            `
            SELECT e.event_id, e.title, e.event_description, e.start_time, e.end_time,
                   e.standard_price, e.event_status,
                   v.venue_name, v.city
            FROM Event_ e
            LEFT JOIN Venue v ON e.venue_id = v.venue_id
            ORDER BY e.start_time ASC
        `
        );

        let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n<events>\n`;

        for (const row of evVenRows) {
            xmlString += `  <event>\n`;
            xmlString += `    <id>${row.event_id}</id>\n`;
            xmlString += `    <title>${escapeXml(row.title)}</title>\n`;
            xmlString += `    <venue>${escapeXml(
                row.venue_name
            )}</venue>\n`;
            xmlString += `    <city>${escapeXml(row.city)}</city>\n`;
            xmlString += `    <start_time>${
                row.start_time
                    ? row.start_time.toISOString?.() ?? row.start_time
                    : ""
            }</start_time>\n`;
            xmlString += `    <end_time>${
                row.end_time
                    ? row.end_time.toISOString?.() ?? row.end_time
                    : ""
            }</end_time>\n`;
            xmlString += `    <standard_price>${
                row.standard_price ?? ""
            }</standard_price>\n`;
            xmlString += `    <status>${
                escapeXml(row.event_status || "")
            }</status>\n`;
            xmlString += `  </event>\n`;
        }
        xmlString += `</events>`;

        res.setHeader("Content-Type", "application/xml");
        res.send(xmlString);
    } catch (error) {
        console.error("GET /api/xml/events error", error);
        res.status(500).send(`<error>Server error</error>`);
    }
});

function escapeXml(text) {
    if (text == null) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

module.exports = expRouter;