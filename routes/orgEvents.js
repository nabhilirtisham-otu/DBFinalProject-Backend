/*
Organizer CRUD route for events
*/

const expressLib = require("express");
const connPool = require("../dbHelper.js");
const { validAuth, validRole } = require("../middleware/auth.js");

const expRouter = expressLib.Router();

//GET all venues for event creation
expRouter.get(
    "/venues/all",
    validAuth,
    validRole(["Organizer"]),
    async (req, res) => {
        try {
            const [rows] = await connPool.query(`
                SELECT venue_id, venue_name, city 
                FROM Venue
                ORDER BY venue_name;
            `);

            res.json({ venues: rows });
        } catch (error) {
            console.error("GET /organizer/events/venues error:", error);
            res.status(500).json({ error: "Server error loading venues." });
        }
    }
);

//GET endpoint to retrieve events for a logged-in organizer
expRouter.get(
    "/",
    validAuth,
    validRole(["Organizer"]),
    async (req, res) => {
        const oID = req.session.user.id;
        try {
            const [eventRows] = await connPool.query(
                `
                SELECT e.*, v.city, v.venue_name
                FROM Event_ e
                JOIN Venue v ON e.venue_id = v.venue_id
                WHERE e.organizer_id = ?
            `,
                [oID]
            );
            res.json({ events: eventRows });
        } catch (error) {
            console.error("GET /organizer/events error", error);
            res
                .status(500)
                .json({ error: "Server error occurred." });
        }
    }
);

//POST endpoint to create events
expRouter.post(
    "/",
    validAuth,
    validRole(["Organizer"]),
    async (req, res) => {
        try {
            const oID = req.session.user.id;
            const {
                venue_id,
                title,
                event_description,
                start_time,
                end_time,
                standard_price,
                event_status,
            } = req.body;

            const [eventInsert] = await connPool.query(
                `
                INSERT INTO Event_ (
                    organizer_id, venue_id, title, event_description,
                    start_time, end_time, standard_price, event_status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [oID, venue_id, title, event_description, start_time, end_time, standard_price, event_status]
            );

            res.status(201).json({
                message: "Event created successfully.",
                eventId: eventInsert.insertId,
            });
        } catch (error) {
            console.error("POST /organizer/events error", error);
            res.status(500).json({ error: "Server error" });
        }
    }
);

//GET endpoint to retrieve single events
expRouter.get(
    "/:id",
    validAuth,
    validRole(["Organizer"]),
    async (req, res) => {
        try {
            const eID = req.params.id;
            const oID = req.session.user.id;

            const [eventRows] = await connPool.query(
                `
                SELECT * FROM Event_
                WHERE event_id = ? AND organizer_id = ?
            `,
                [eID, oID]
            );

            if (eventRows.length === 0) {
                return res
                    .status(404)
                    .json({ error: "Event information not found." });
            }
            res.json({ event: eventRows[0] });
        } catch (error) {
            console.error("GET /organizer/events/:id error", error);
            res.status(500).json({ error: "Server error" });
        }
    }
);

//PUT endpoint to update an event
expRouter.put(
    "/:id",
    validAuth,
    validRole(["Organizer"]),
    async (req, res) => {
        try {
            const eID = req.params.id;
            const oID = req.session.user.id;

            const updateFields = [];
            const updateParams = [];

            for (const [key, value] of Object.entries(req.body)) {
                updateFields.push(`${key} = ?`);
                updateParams.push(value);
            }

            if (updateFields.length === 0) {
                return res
                    .status(400)
                    .json({ error: "No fields to update." });
            }

            updateParams.push(eID, oID);

            await connPool.query(
                `
                UPDATE Event_
                SET ${updateFields.join(", ")}
                WHERE event_id = ? AND organizer_id = ?
            `,
                updateParams
            );

            res.json({ message: "Event updated successfully." });
        } catch (error) {
            console.error("PUT /organizer/events/:id error", error);
            res.status(500).json({ error: "Server error" });
        }
    }
);

//DELETE endpoint to delete an event
expRouter.delete(
    "/:id",
    validAuth,
    validRole(["Organizer"]),
    async (req, res) => {
        const eID = req.params.id;
        const oID = req.session.user.users_id || req.session.user.id;

        try {
            await connPool.query(
                `
                DELETE FROM Event_
                WHERE event_id = ? AND organizer_id = ?
            `,
                [eID, oID]
            );
            res.json({ message: "Event deleted successfully." });
        } catch (error) {
            console.error("DELETE /organizer/events/:id error", error);
            res.status(500).json({ error: "Server error" });
        }
    }
);

module.exports = expRouter;                         //Export to allow usage elsewhere