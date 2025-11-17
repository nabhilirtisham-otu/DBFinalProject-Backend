/*
Weather-related API endpoints
*/

//Imports Express framework and DB connection
const expressLib = require('express');
const connPool = require('../dbHelper.js');

const expRouter = expressLib.Router();                  //Create new router instance

const openWeatherKey = process.env.OPENWEATHERAPIKEY;       //Read OpenWeatherMap API key
if (!openWeatherKey){                                   //Warning if API key environment variable is missing
    console.warn("[weather route] OPENWEATHERAPIKEY not set in .env - external API fetch will fail.");
}

//Fetch weather information for a city and save to the DB
expRouter.get("/fetch/:city", async (req, res) => {
    const weatherCity = req.params.city;                       //Extract city name from URL parameter
    if (!weatherCity){
        return res.status(400).json({error: "Please provide city."});           //Error if city isn't provided
    }
    try {
        if(!openWeatherKey){
            return res.status(500).json({error: "OPENWEATHERAPIKEY not set."});           //Error if openweather API key isn't provided
        }
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(weatherCity)}&units=metric&appid=${openWeatherKey}`;           //Request URL for openweathermap API
        const weatherReq = await fetch(weatherUrl);                 //Send GET request to OpenWeatherMap

        if(!weatherReq.ok){                                 //Error handling and logging
            const msg = await weatherReq.text();
            console.error("Error in fetching OpenWeather:", weatherReq.status, msg);
            return res.status(502).json({ error: "Could not fetch weather from provider.", status: weatherReq.status});
        }

        const weatherData = await weatherReq.json();                //Convert API response JSON to JS object

        const temperature = weatherData.main && weatherData.main.temp ? Number(weatherData.main.temp) : null;       //Convert temperature to number and store if existing, set temp to null otherwise
        const description = (weatherData.weather && weatherData.weather[0] && weatherData.weather[0].description) || null;        //Extract weather description if existing, set desc to null otherwise

        const [weatherInfo] = await connPool.query(                 //Insert new row containing temp and desc into WeatherLog table
            `INSERT INTO WeatherLog (city, temperature, description) VALUES (?, ?, ?)`,
            [weatherCity, temperature, description]
        );

        const weatherRows = await connPool.query(`SELECT * FROM WeatherLog WHERE id = ?`, [weatherInfo.insertId]);          //Fetch inserted record to return to frontend
        res.json({saved: weatherRows[0]});                          //Return saved log as JSON to client
    } catch (error) {                                               //Error handling and logging
        console.error("GET /api/weather/fetch/:city error", error);
        res.status(500).json({error: "Server error fetching weather."});
    }
});

//List all weather logs
expRouter.get("/logs", async (req, res) => {
    try {
        const weatherRows = await connPool.query(`SELECT * FROM WeatherLog ORDER BY time_logged DESC LIMIT 100`);       //Retrieve saved weather logs, sorted by newest to oldest (time_logged)
        res.json({ logs: weatherRows});                     //Return logs as JSON
    } catch (error) {                                       //Error handling and logging
        console.error("GET /api/weather/logs error", error);
        res.status(500).json({error: "Server error"});
    }
});

//Filter weather logs by city
expRouter.get("/city/:city", async (req, res) => {
    const weatherCity = req.params.city;                //Extract city from URL parameter
    try {                                               //Query weather logs for the provided city
        const [weatherRows] = await connPool.query(
            `SELECT * FROM WeatherLog WHERE LOWER(city) = LOWER(?) ORDER BY time_logged DESC LIMIT 500`,
            [weatherCity]
        );
        res.json({logs: weatherRows});                  //Return filtered list as JSON
    } catch (error) {                                   //Error handling and logging
        console.error("GET /api/weather/city/:city error", error);
        res.status(500).json({error: "Server error"});
    }
});

module.exports = expRouter;                             //Export router to let other files use it