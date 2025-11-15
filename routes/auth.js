/*
Handles registration, login, and logout.
*/

const expresslib = require('express');                              //Import Express.js library
const bcryptlib =  require('bcrypt');                               //Import bcrypt (password hashing) library
const dbHelper = require('../dbHelper.js');                                        //Import dbHelper.js (DB connection pool file)
const { validAuth, destroySess } = require('../middleware/auth.js');        //Import middleware functions from auth.js (middleware folder)
const expRouter = expresslib.Router()                                  //Create Express router instance

//User registration POST route
expRouter.post('/register', async(req, res) => {                    //Express.js allows async for asynchronous DB operations
    try {
        const {userName, email, pwd, userRole} = req.body;          //User registration information extracted from frontend form fields
        if (!userName || !email || !pwd || !userRole){
            return res.status(400).json({message: 'Please fill out all fields.'});      //Error handling to ensure all fields are filled
        }

        const hashPwd = await bcryptlib.hash(pwd, 10);              //Hashes user's password with 10 rounds of encryption

        const [addUser] = await dbHelper.query(                           //Insert the new user into the Users table of the DB
            `INSERT INTO Users (users_name, email, pwd, user_role)
            VALUES (?, ?, ?, ?)`,
            [userName, email, hashPwd, userRole]
        );

        res.status(201).json({message: 'Sucessful registration.', userID: addUser.insertId});   //Successfull HTTP 201 response and the new user ID
        
    } catch (error) {                                               //Error display if registration error occurs
        console.error('Registration error:', error);
        res.status(500).json({message: 'Registration error.'});
    }
});

//User login POST route
expRouter.post('/login', async(req, res) => {
    try{
        const{email, password} = req.body;                               //User login information extracted from frontend form fields

        if (!email || !password){                                        //Error handling ensures nonempty inputs
            return res.status(400).json({ message: 'Please fill in email and password.'});
        }

        const [userRows] = await dbHelper.query('SELECT * FROM Users WHERE email = ?', [email]);  //Return users in Users matching the email address
        if (userRows.length === 0){
            return res.status(404).json({message: 'User not found.'});      //Error handling if user not in Users table
        }

        const user = userRows[0];                            //Extract user DB record for reference

        if(!(await bcryptlib.compare(password, user.pwd))){          //Compare plain (provided) and hashed (stored) passwords
            return res.status(401).json({message: 'Invalid credentials.'});     //Error message if passwords don't match
        }

        req.session.user = {                                 //Session variable storing user information for login persistence
            users_id: user.users_id,
            name: user.users_name,
            role: user.user_role,
            email: user.email
        };

        res.json({message: 'Successful login.', user: req.session.user});    //JSON success message with user details
    } catch (error) {                                               //Error display if login error occurs
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login error.'});
    }
});

//Logout user, refers to functions in middleware/auth.js
expRouter.post('/logout', validAuth, destroySess);


module.exports = expRouter;                                         //Exports router to let other files use it