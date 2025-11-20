/*
Handles registration, login, and logout.
*/

const expresslib = require("express");
const bcryptlib = require("bcrypt");
const dbHelper = require("../dbHelper.js");
const { validAuth, destroySess } = require("../middleware/auth.js");
const expRouter = expresslib.Router();

//User registration POST route
expRouter.post("/register", async (req, res) => {
    let dbConn;
    try {
        const { userName, email, pwd, userRole, organizationName, phone } =
            req.body;

        if (!userName || !email || !pwd || !userRole) {
            return res
                .status(400)
                .json({ message: "Please fill out all fields." });
        }

        if (!["Organizer", "Customer"].includes(userRole)) {
            return res.status(400).json({ message: "Invalid role selected." });
        }

        const hashPwd = await bcryptlib.hash(pwd, 10);

        dbConn = await dbHelper.getConnection();
        await dbConn.beginTransaction();

        const [addUser] = await dbConn.query(
            `
            INSERT INTO Users (users_name, email, pwd, user_role)
            VALUES (?, ?, ?, ?)
        `,
            [userName, email, hashPwd, userRole]
        );

        if (userRole === "Organizer") {
            await dbConn.query(
                `
                INSERT INTO Organizer (organizer_id, organization_name, phone)
                VALUES (?, ?, ?)
            `,
                [addUser.insertId, organizationName || null, phone || null]
            );
        }

        await dbConn.commit();

        res.status(201).json({
            message: "Successful registration.",
            userID: addUser.insertId,
        });
    } catch (error) {
        if (dbConn) {
            try {
                await dbConn.rollback();
            } catch (rollbackErr) {
                console.error("Rollback failed:", rollbackErr);
            }
        }
        console.error("Registration error:", error);
        res.status(500).json({ message: "Registration error." });
    } finally {
        if (dbConn) {
            dbConn.release();
        }
    }
});

//User login POST route
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

        //Store session info
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

//Check current session
expRouter.get("/session", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({loggedIn: false});
    }
    return res.json({
        loggedIn: true,
        user: req.session.user
    });
});

//Logout user, refers to functions in middleware/auth.js
expRouter.post("/logout", validAuth, destroySess);

module.exports = expRouter;