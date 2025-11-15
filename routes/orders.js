/*
Defines routes for listing, creating, updating, and deleting orders
*/

//Imports Express framework, DB connection, and authorization functions
const expressLib = require('express');
const connPool = require('../dbHelper.js');
const { validAuth, validRole } = require('../middleware/auth.js');

const expRouter = expressLib.Router();              //Instantiates new Express router

//POST endpoint to create order + payment, and marks tickets as sold in a transaction
expRouter.post('/', validAuth, async (req, res) => {
    const uID = req.session.user.users_id || req.session.user.id;       //Get the user ID from the current session object
    const {tickets, payMethod = 'Credit'} = req.body;                   //Retrieve ticket IDs and payment method (default Credit) from POST request body

    if (!Array.isArray(tickets) || tickets.length === 0) {              //Ticket selection validation - must be at least one ticket in the array
        return res.status(400).json({error: 'No tickets provided.'});
    }

    const connDB = await connPool.getConnection();                      //Obtain connection to DB, needed for transactions

    try {
        await connDB.beginTransaction();                                //Start a DB transaction

        const [lockedTickets] = await connDB.query(                     //Read and locks selected tickets, ensuring they can't be modified until transaction finishes
            `SELECT ticket_id, ticket_status, ticket_price
            FROM Ticket
            WHERE ticket_id IN (?) FOR UPDATE`, [tickets]
        );
        if (lockedTickets.length !== tickets.length){                   //Error if discrepancy in the locked and requested tickets
            await connDB.rollback();                                    //Rollback to ensure command doesn't go through and cause crash
            return res.status(404).json({error:'Some tickets not found'});
        }

        for (const tickRow of lockedTickets){                           //Checks for sold/reserved tickets within the locked tickets, rolls back if any exist
            if (tickRow.ticket_status !== 'Available'){
                await connDB.rollback();
                return res.status(409).json({error: `Ticket ${tickRow.ticket_id} unavailable: (${tickRow.ticket_status})`});
            }
        }

        const totalTicketPrice = lockedTickets.reduce((sum, r) => sum + Number(r.ticket_price), 0.0);       //Reducer function adding up all ticket prices in locked ticket array

        const [orderRecord] = await connDB.query(                       //Insert the order information into Orders
            `INSERT INTO Orders (users_id, order_amount, order_status) VALUES (?, ?, 'Paid')`,
            [uID, totalTicketPrice]
        );
        const oID = orderRecord.insertId;                               //Retrieve order ID

        const promises = [];                                            //Array of promises to run all updates in parallel
        for (const t of tickets) {                                      //Loop through purchased tickets and update ticket status + order ID
            promises.push(connDB.query(
                `UPDATE Ticket SET ticket_status = 'Sold', order_id = ? WHERE ticket_id = ?`,
                [oID, t]
            ));
        }
        await Promise.all(promises);                                    //Attempt to execute all updates and wait

        await connDB.query(                                             //Insert the payment information into Payment
            `INSERT INTO Payment (order_id, payment_method, payment_amount, payment_status) VALUES (?, ?, ?, 'Completed)`,
            [oID, payMethod, totalTicketPrice]
        );
        await connDB.commit();                                          //Commit changes if all steps succeed
        res.status(201).json({message:'Order completed successfull', oID, amount:totalTicketPrice});    //JSON success response with order information
    } catch (error){                                                    //Log server error
        console.error('POST /api/orders error', error);
        try{
            await connDB.rollback();                                    //Attempt to undo changes
        } catch(err){                                                   //Catch rollback error
            console.error('Rollback error', err);
            res.status(500).json({error:'Server error during purchase.'});
        } finally {                                                     //Release DB connection back to pool
            connDB.release();
        }
    }
});

//GET endpoint for retrieving order details (authenticated users only)
expRouter.get('/:id', validAuth, async (req, res) => {
    const oID = parseInt(req.params.id);                                //Retrieves and validates order id
    if (!oID){
        return res.status(400).json({error: 'Order id invalid.'});
    }
    const uID = req.session.user.users_id || req.session.user.id;       //Get the user ID from the current session object
    
    try{
        const [userOrders] = await pool.query('SELECT * FROM Orders WHERE order_id = ? AND users_id = ?', [oID, uID]);      //Retrieve order details belonging to the current user
        if (userOrders.length === 0){                                   //Error if no order details can be retrieved
            return res.status(404).json({error:'No order information found.'});
        }
        const userOrder = userOrders[0];                                //Extract first order object

        const userTickets = await pool.query(                           //Retrieve tickets and seat information belonging to the current order
            `SELECT t.*, s.row_num, s.seat_number, e.title AS event_title
            FROM Ticket t JOIN Seat s ON t.seat_id = s.seat_id
            JOIN Event_ e ON t.event_id = e.event_id
            WHERE t.order_id = ?`, [oID]
        );
        const [paymentInfo] = await pool.query('SELECT * FROM Payment WHERE order_id = ?', [oID]);  //Retrieve payment information for the current order
        res.json({userOrder, userTickets, paymentInfo});                //Return order, tickets, and payment information
    } catch (error) {
        console.error('GET /api/orders/:id error', error);
        res.status(500).json({error:'Server error'});
    }
});