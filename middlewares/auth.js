const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

// auth
exports.auth = async (req, res, next) => {
    try {

        //fetch token
        const token = req.cookies.login_cookie
            || req.body.token
            || req.header("Authorization").replace("Bearer ", "");  // use Authorization 

        // if token missing then return respose
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token Missing"
            })
        }

        // verify token
        try {
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            console.log(decode);
            req.user = decode;
        } catch (error) {
            console.error(error.message);
            return res.status(401).json({
                success: false,
                message: "token is invalid"
            })

        }

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "something went wrong while validating the token"
        })
    }
}

// isstudent
exports.isStudent = async (req, res, next) => {
    try {

        if (req.user.accountType !== "Student") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for only Students"
            })
        }
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "user's student role cannot be verified"
        })
    }
}


// isinstructor
exports.isInstructor = async (req, res, next) => {
    try {

        if (req.user.accountType !== "Instructor") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for only Instructors"
            })
        }
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "user's Instructor role cannot be verified"
        })
    }
}


// isadmin
exports.isAdmin = async (req, res, next) => {
    try {

        if (req.user.accountType !== "Admin") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for only Admins"
            })
        }
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "user's Admin role cannot be verified"
        })
    }
}