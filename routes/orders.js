// routes/orders.js
/*
Defines routes for listing, creating, updating, and deleting orders
*/

const expressLib = require("express");
const connPool = require("../dbHelper.js");
const { validAuth } = require("../middleware/auth.js");

const expRouter = expressLib.Router();

// POST endpoint to create order + payment, and mark tickets as sold in a transaction
expRouter.post("/", validAuth, async (req, res) => {
    const uID = req.session.user.id;
    if (!uID) {
        return res.status(401).json({ error: "Not authenticated." });
    }

    const { tickets, payMethod = "Credit" } = req.body;

    if (!Array.isArray(tickets) || tickets.length === 0) {
        return res.status(400).json({ error: "No tickets provided." });
    }

    const connDB = await connPool.getConnection();

    try {
        await connDB.beginTransaction();

        const [lockedTickets] = await connDB.query(
            `
            SELECT ticket_id, ticket_status, ticket_price
            FROM Ticket
            WHERE ticket_id IN (?) FOR UPDATE
        `,
            [tickets]
        );

        if (lockedTickets.length !== tickets.length) {
            await connDB.rollback();
            return res
                .status(404)
                .json({ error: "Some tickets not found." });
        }

        for (const tickRow of lockedTickets) {
            if (tickRow.ticket_status !== "Available") {
                await connDB.rollback();
                return res.status(409).json({
                    error: `Ticket ${tickRow.ticket_id} unavailable (${tickRow.ticket_status}).`,
                });
            }
        }

        const totalTicketPrice = lockedTickets.reduce(
            (sum, r) => sum + Number(r.ticket_price),
            0.0
        );

        const [orderRecord] = await connDB.query(
            `
            INSERT INTO Orders (users_id, order_amount, order_status)
            VALUES (?, ?, 'Paid')
        `,
            [uID, totalTicketPrice]
        );
        const oID = orderRecord.insertId;

        const promises = [];
        for (const t of tickets) {
            promises.push(
                connDB.query(
                    `
                    UPDATE Ticket
                    SET ticket_status = 'Sold', order_id = ?
                    WHERE ticket_id = ?
                `,
                    [oID, t]
                )
            );
        }
        await Promise.all(promises);

        await connDB.query(
            `
            INSERT INTO Payment (order_id, payment_method, payment_amount, payment_status)
            VALUES (?, ?, ?, 'Completed')
        `,
            [oID, payMethod, totalTicketPrice]
        );

        await connDB.commit();
        res.status(201).json({
            message: "Order completed successfully.",
            oID,
            amount: totalTicketPrice,
        });
    } catch (error) {
        console.error("POST /api/orders error", error);
        try {
            await connDB.rollback();
        } catch (err) {
            console.error("Rollback error", err);
        }
        res.status(500).json({ error: "Server error during purchase." });
    } finally {
        connDB.release();
    }
});

// GET endpoint for retrieving order details (authenticated users only)
expRouter.get("/:id", validAuth, async (req, res) => {
    const order_id = parseInt(req.params.id, 10);
    if (!order_id) {
        return res.status(400).json({ error: "Order id invalid." });
    }

    const uID = req.session.user.id;

    try {
        const [userOrders] = await connPool.query(
            "SELECT * FROM Orders WHERE order_id = ? AND users_id = ?",
            [order_id, uID]
        );
        if (userOrders.length === 0) {
            return res
                .status(404)
                .json({ error: "No order information found." });
        }
        const userOrder = userOrders[0];

        const [userTickets] = await connPool.query(
            `
            SELECT t.*, s.row_num, s.seat_number, e.title AS event_title
            FROM Ticket t
            JOIN Seat s ON t.seat_id = s.seat_id
            JOIN Event_ e ON t.event_id = e.event_id
            WHERE t.order_id = ?
        `,
            [order_id]
        );

        const [paymentInfo] = await connPool.query(
            "SELECT * FROM Payment WHERE order_id = ?",
            [order_id]
        );

        res.json({
            order: userOrder,
            tickets: userTickets,
            payments: paymentInfo
        });

    } catch (error) {
        console.error("GET /api/orders/:id error", error);
        res.status(500).json({ error: "Server error" });
    }
});

// GET endpoint for listing all the orders for the current logged-in user
expRouter.get("/", validAuth, async (req, res) => {
    const uID = req.session.user.id;
    try {
        const [orderRows] = await connPool.query(
            "SELECT * FROM Orders WHERE users_id = ? ORDER BY order_date DESC",
            [uID]
        );
        res.json({ orders: orderRows });
    } catch (error) {
        console.error("GET /api/orders error", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = expRouter;