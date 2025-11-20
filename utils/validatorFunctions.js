/*
Functions to validate inputs (numbers, strings, and dates)
*/

//Checks if inputted number is positive and finite
function validNum(n) {
    const valid =
        typeof n === "number" && Number.isFinite(n) && n >= 0;
    return valid;
}

//Checks if inputted string is valid string w/ positive (trimmed) length
function validString(s) {
    const valid =
        typeof s === "string" && s.trim().length > 0;
    return valid;
}

//Checks if inputted date string is valid date (using isNaN())
function validDate(d) {
    const valid = !isNaN(Date.parse(d));
    return valid;
}

module.exports = { validNum, validString, validDate };