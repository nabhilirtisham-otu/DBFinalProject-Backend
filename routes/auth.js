// routes/auth.js
/*
Handles registration, login, and logout.
*/

const expresslib = require("express");
const bcryptlib = require("bcrypt");
const dbHelper = require("../dbHelper.js");
const { validAuth, destroySess } = require("../middleware/auth.js");
const expRouter = expresslib.Router();

// User registration POST route
expRouter.post("/register", async (req, res) => {
    try {
        const { userName, email, pwd, userRole } = req.body;

        if (!userName || !email || !pwd || !userRole) {
            return res
                .status(400)
                .json({ message: "Please fill out all fields." });
        }

        const hashPwd = await bcryptlib.hash(pwd, 10);

        const [addUser] = await dbHelper.query(
            `
            INSERT INTO Users (users_name, email, pwd, user_role)
            VALUES (?, ?, ?, ?)
        `,
            [userName, email, hashPwd, userRole]
        );

        res.status(201).json({
            message: "Successful registration.",
            userID: addUser.insertId,
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Registration error." });
    }
});

// User login POST route
expRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Please fill in email and password." });
        }

        const [userRows] = await dbHelper.query(
            "SELECT * FROM Users WHERE email = ?",
            [email]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = userRows[0];

        const ok = await bcryptlib.compare(password, user.pwd);
        if (!ok) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Store session info. Use both users_id and id to be safe for older code.
        req.session.user = {
            users_id: user.users_id,
            id: user.users_id,
            name: user.users_name,
            role: user.user_role,
            email: user.email,
        };

        res.json({ message: "Successful login.", user: req.session.user });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login error." });
    }
});

// Check current session
expRouter.get("/session", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({loggedIn: false});
    }
    return res.json({
        loggedIn: true,
        user: req.session.user
    });
});

// Logout user, refers to functions in middleware/auth.js
expRouter.post("/logout", validAuth, destroySess);

module.exports = expRouter;