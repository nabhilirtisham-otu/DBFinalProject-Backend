
//Checks if the inputted number is positive and finite
function validateNum(n) {
    valid = (typeof n === 'number' && Number.isFinite(n) && n >= 0);
    return valid;
}

//Checks if the inputted string is a valid string with a positive (trimmed) length
function validateString(s) {
    valid = (typeof s === 'string' && s.trim().length >= 0);
    return valid;
}

//Checks if the inputted date string is a valid date by using isNaN()
function validateDate(d) {
    valid = (!isNaN(Date.parse(d)));
    return valid;
}

const expressDB = require('express');                                   //Import express framework
const dbHelper = require('../dbHelper.js');                             //Import DB connection
const { validAuth, validRole } = require('../middleware/auth.js');      //Import middleware authentication functions