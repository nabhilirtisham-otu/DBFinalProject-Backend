/*
Authentication and authorization logic. Intercept HTTP requests before reaching main
route handlers and validate them before either letting them proceed or blocking them.
*/

//Checks if the user is logged in
function validAuth(req, res, next){
    if (req.session && req.session.user ){                                      //Checks if saved authRoutes exist
        return next();                                                              //If valid, move to the next route handler
    } else {
        return res.status(401).json({message: 'Unathourzed: Please log in.'})      //Error message if invalid
    }
}

//Checks if user role is valid
function validRole(role){
    return (req, res, next) => {                                                //Calls the function below
        if (req.session && req.session.user && req.session.user.role === role) {       //Validates user role
            return next()                                                           //If valid, move to the next route handler
        } else {
            return res.status(403).json({message: 'Forbidden: Insufficient permissions.'})              //Error message if invalid
        }
    };
}

//user logout
function destroySess(req, res){
    req.session.destroy(err => {                                                //delete session data from memory
        if (err) {                                                              
            console.error('Could not destroy session:', err);                   //error handling for unsuccessful destruction
            return res.status(500).json({message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');                                         //removes client-side session tracking cookie
        res.status(200).json({message: 'Successful logout.' });
    })
}

module.exports = { validAuth, validRole, destroySess};                          //Exports functions to let other files use them