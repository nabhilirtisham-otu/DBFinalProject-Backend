/*
Weather-related API endpoints
*/

//Imports Express framework and DB connection
const expressLib = require('express');
const connPool = require('../dbHelper.js');

const expRouter = expressLib.Router();                  //Create new router instance

const openWeatherKey = process.env.OPENWEATHERAPIKEY;       //Read OpenWeatherMap API key
if (!openWeatherKey){
    console.warn("[weather route] OPENWEATHERAPIKEY not set in .env - external API fetch will fail.");
}

