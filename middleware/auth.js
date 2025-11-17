// middleware/auth.js
/*
Authentication and authorization logic. Intercept HTTP requests before reaching main
route handlers and validate them before either letting them proceed or blocking them.
*/

// Checks if the user is logged in
function validAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.status(401).json({ message: "Unauthorized: Please log in." });
    }
}

// Checks if user role is valid (supports single role string or array of roles)
function validRole(roles) {
    // normalize roles to an array
    const allowed = Array.isArray(roles) ? roles : [roles];

    return (req, res, next) => {
        if (
            req.session &&
            req.session.user &&
            allowed.includes(req.session.user.role)
        ) {
            return next();
        } else {
            return res
                .status(403)
                .json({ message: "Forbidden: Insufficient permissions." });
        }
    };
}

// User logout
function destroySess(req, res) {
    req.session.destroy((err) => {
        if (err) {
            console.error("Could not destroy session:", err);
            return res.status(500).json({ message: "Error logging out" });
        }
        res.clearCookie("user_session");
        res.status(200).json({ message: "Successful logout." });
    });
}

module.exports = { validAuth, validRole, destroySess };