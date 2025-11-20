/*
Display 10 DB views
*/

//Imports Express framework and DB connection
const expressLib = require("express");
const connPool = require("../dbHelper.js");

const expRouter = expressLib.Router();                          //Creates Express router instance

async function runView(res, view){                              //Display the view
    try {
        const [viewInfo] = await connPool.query(`SELECT * FROM ${view}`);      //Query all the information from the designated view
        res.json({rows: viewInfo});                                  //Send view info back to client as JSON
    } catch (error) {
        console.error(`Error in view ${view}`, error);          //Error handling and logging
        res.status(500).json({error:"Server error in running view."});
    }
}

//Set up routes calling runView() depending on the view name - displays all views
expRouter.get("/1", (req, res) => runView(res, "CustomerOrders"));
expRouter.get("/2", (req, res) => runView(res, "DBUsers"));
expRouter.get("/3", (req, res) => runView(res, "EventCategories"));
expRouter.get("/4", (req, res) => runView(res, "EventSales"));
expRouter.get("/5", (req, res) => runView(res, "EventTicketDetails"));
expRouter.get("/6", (req, res) => runView(res, "FullEventPayments"));
expRouter.get("/7", (req, res) => runView(res, "HighPricedEvents"));
expRouter.get("/8", (req, res) => runView(res, "OrganizerRevenue"));
expRouter.get("/9", (req, res) => runView(res, "UnreadNotifications"));
expRouter.get("/10", (req, res) => runView(res, "UpcomingPerformances"));

module.exports = expRouter;                                     //Export router to let other files use it