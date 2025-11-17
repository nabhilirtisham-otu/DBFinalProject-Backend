// routes/export.js
/*
CSV and PDF export routes
*/

const expressLib = require("express");
const connPool = require("../dbHelper.js");
const pdfkitLib = require("pdfkit");

const expRouter = expressLib.Router();

// Retrieve event and venue data
async function fetchEvents() {
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
    return evVenRows;
}

// CSV export route
expRouter.get("/events.csv", async (req, res) => {
    try {
        const eventRows = await fetchEvents();
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="events.csv"`
        );

        res.write(
            "event_id,title,venue,city,start_time,end_time,price,status\n"
        );

        const safeEscape = (s) => {
            if (s === null || s === undefined) return "";
            return `"${String(s).replace(/"/g, '""')}"`;
        };

        for (const row of eventRows) {
            const csvLine = [
                row.event_id,
                safeEscape(row.title),
                safeEscape(row.venue_name),
                safeEscape(row.city),
                row.start_time
                    ? row.start_time.toISOString?.() ?? row.start_time
                    : "",
                row.end_time
                    ? row.end_time.toISOString?.() ?? row.end_time
                    : "",
                row.standard_price ?? "",
                row.event_status ?? "",
            ].join(",");
            res.write(csvLine + "\n");
        }
        res.end();
    } catch (error) {
        console.error("GET /api/export/events.csv error", error);
        res
            .status(500)
            .json({ error: "Server error in generating CSV export file." });
    }
});

// PDF export route
expRouter.get("/events.pdf", async (req, res) => {
    try {
        const eventRows = await fetchEvents();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="events.pdf"`
        );

        const pdfDoc = new pdfkitLib({ margin: 40, size: "A4" });
        pdfDoc.pipe(res);

        pdfDoc.fontSize(18).text("Event List", { align: "center" });
        pdfDoc.moveDown(0.5);
        pdfDoc
            .fontSize(10)
            .text(`Generated: ${new Date().toLocaleString()}`, {
                align: "center",
            });
        pdfDoc.moveDown(1);

        const tableHead = pdfDoc.y;
        pdfDoc.fontSize(10).text("ID", 40, tableHead);
        pdfDoc.text("Title", 80, tableHead);
        pdfDoc.text("Venue (City)", 240, tableHead);
        pdfDoc.text("Start", 340, tableHead);
        pdfDoc.text("Price", 420, tableHead);

        pdfDoc.moveDown();

        eventRows.forEach((row) => {
            pdfDoc.moveDown(0.2);
            pdfDoc
                .fontSize(10)
                .text(String(row.event_id), 40, pdfDoc.y);
            pdfDoc.text(row.title || "", 80, pdfDoc.y, {
                width: 160,
            });
            pdfDoc.text(
                `${row.venue_name || ""} (${row.city || ""})`,
                240,
                pdfDoc.y,
                { width: 100 }
            );
            const startTime = row.start_time
                ? new Date(row.start_time).toLocaleString()
                : "";
            pdfDoc.text(startTime, 340, pdfDoc.y, { width: 80 });
            pdfDoc.text(
                row.standard_price != null
                    ? Number(row.standard_price).toFixed(2)
                    : "",
                420,
                pdfDoc.y,
                { width: 60 }
            );
        });

        pdfDoc.end();
    } catch (error) {
        console.error("GET /api/export/events.pdf error", error);
        res.status(500).json({ error: "Server error generating PDF" });
    }
});

module.exports = expRouter;