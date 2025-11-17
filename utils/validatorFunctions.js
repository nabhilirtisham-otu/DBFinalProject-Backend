// utils/validatorFunctions.js

// Checks if the inputted number is positive and finite
function validNum(n) {
    const valid =
        typeof n === "number" && Number.isFinite(n) && n >= 0;
    return valid;
}

// Checks if the inputted string is a valid string with a positive (trimmed) length
function validString(s) {
    const valid =
        typeof s === "string" && s.trim().length > 0;
    return valid;
}

// Checks if the inputted date string is a valid date by using isNaN()
function validDate(d) {
    const valid = !isNaN(Date.parse(d));
    return valid;
}

module.exports = { validNum, validString, validDate };