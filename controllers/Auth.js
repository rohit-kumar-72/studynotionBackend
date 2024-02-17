const otpGenerator = require("otp-generator");
const OTP = require("../models/OTP");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Profile = require("../models/Profile");
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const otpTemplate = require("../mail/templates/emailVerificationTemplate");
const { passwordUpdated } = require("../mail/templates/passwordUpdate")
require("dotenv").config();

// Send otp
exports.sendOTP = async (req, res) => {

    try {

        // fetched email from request body
        const { email } = req.body;

        // check if user already exist
        const checkUserPresent = await User.findOne({ email });

        // if user already exist , then return a response
        if (checkUserPresent) {
            return res.status(401).json({
                success: false,
                message: "User already Registered"
            })
        }

        // generate otp
        var otp = otpGenerator.generate(6, {
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false
        });
        console.log("otp generated: ", otp)

        // check unique otp or not?
        let result = await OTP.findOne({ otp });
        while (result) {
            otp = otpGenerator.generate(6, {
                lowerCaseAlphabets: false,
                upperCaseAlphabets: false,
                specialChars: false
            })
            result = await OTP.findOne({ otp });
        }

        const otpPayload = { email, otp };

        //send otp
        const info = mailSender(email,
            "signup otp",
            otpTemplate(otp)
        );

        // create a entry for otp
        const otpbody = await OTP.create(otpPayload);
        console.log(otpbody);

        return res.status(200).json({
            success: true,
            message: "OTP Sent Successfully",
            otp
        })

    } catch (error) {
        console.log(error);
        console.error(error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        })

    }

}


// signup
exports.signup = async (req, res) => {
    try {

        // data fetch
        const {
            FirstName,
            LastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber,
            otp
        } = req.body;

        //validation
        if (!FirstName || !email || !password || !confirmPassword || !otp) {
            return res.status(403).json({
                success: false,
                message: "All fields are required"
            })
        }

        //password match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "password not matching"
            })
        }

        //check already exist or not
        const checkUserPresent = await User.findOne({ email })
        if (checkUserPresent) {
            return res.status(401).json({
                success: false,
                message: "User already Registered"
            })
        }

        //find most recent otp stored for user
        const recentOtp = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);

        //otp validation
        if (recentOtp.length == 0) {
            return res.status(400).json({
                success: false,
                message: "OTP not Found"
            })
        } else if (otp != recentOtp[0].otp) {
            return res.status(400).json({
                success: false,
                message: "OTP doesn't match",
                recentOtp
            })
        }

        //hash password
        const hashedpassword = await bcrypt.hash(password, 10);

        //create entry in db

        //creating profile
        const profileDetail = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: contactNumber
        })
        const user = await User.create({
            FirstName,
            LastName,
            email,
            password: hashedpassword,
            accountType,
            additionalDetails: profileDetail._id,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${FirstName} ${LastName}`
        })

        //return respose
        return res.status(200).json({
            success: true,
            message: "User Registered Successfully"
        })

    } catch (error) {
        console.log(error)
        console.error(error.message)
        return res.status(500).json({
            success: false,
            message: "User cannot be registered please try again!!"
        })
    }
}


// login
exports.login = async (req, res) => {
    try {

        // fetching data from user
        const { email, password } = req.body;

        // validation user data
        if (!email || !password) {
            return res.status(403).json({
                success: false,
                message: "Please fill all the mandatory field to Login"
            })
        }

        // checking user exist or not
        const checkExistingUser = await User.findOne({ email }).populate("additionalDetails");
        if (!checkExistingUser) {
            return res.status(401).json({
                success: false,
                message: "Please SignUp to Login"
            })
        }

        if (await bcrypt.compare(password, checkExistingUser.password)) {

            // creating token
            const payload = {
                email: checkExistingUser.email,
                id: checkExistingUser._id,
                accountType: checkExistingUser.accountType
            }
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "24h"
            });
            checkExistingUser.token = token;
            checkExistingUser.password = undefined;

            // making cookie
            const option = {
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
            res.cookie("login_cookie", token, option).json({
                success: true,
                message: "Login successful",
                token,
                checkExistingUser
            })
        } else {
            return res.status(401).json({
                success: false,
                message: `Password is incorrect`,
            })
        }


    } catch (error) {
        console.log(error)
        console.error(error.message)
        return res.status(500).json({
            success: false,
            message: "Unable to Login please try again!!"
        })
    }
}


// Controller for Changing Password
exports.changePassword = async (req, res) => {
    try {
        // Get user data from req.user
        const userDetails = await User.findById(req.user.id)

        // Get old password, new password, and confirm new password from req.body
        const { oldPassword, newPassword } = req.body

        // Validate old password
        const isPasswordMatch = await bcrypt.compare(
            oldPassword,
            userDetails.password
        )
        if (!isPasswordMatch) {
            // If old password does not match, return a 401 (Unauthorized) error
            return res
                .status(401)
                .json({ success: false, message: "The password is incorrect" })
        }

        // Update password
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatedUserDetails = await User.findByIdAndUpdate(
            req.user.id,
            { password: encryptedPassword },
            { new: true }
        )

        // Send notification email
        try {
            const emailResponse = await mailSender(
                updatedUserDetails.email,
                "Password for your account has been updated",
                passwordUpdated(
                    updatedUserDetails.email,
                    `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
                )
            )
            console.log("Email sent successfully:", emailResponse.response)
        } catch (error) {
            // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
            console.error("Error occurred while sending email:", error)
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            })
        }

        // Return success response
        return res
            .status(200)
            .json({ success: true, message: "Password updated successfully" })
    } catch (error) {
        // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
        console.error("Error occurred while updating password:", error)
        return res.status(500).json({
            success: false,
            message: "Error occurred while updating password",
            error: error.message,
        })
    }
}
