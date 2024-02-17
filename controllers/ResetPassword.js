const User = require("../models/User")
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
require("dotenv").config();

// reset password token
exports.resetPasswordToken = async (req, res) => {

    try {
        // get email from req body
        const email = req.body.email;

        // check user for this email, validate email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(403).json({
                success: false,
                message: "User Doesn't Registered Please SignUp"
            })
        }

        // generate token
        const token = crypto.randomUUID();

        // update user by addingtoken and expiration time 
        const updatedDetails = await User.findOneAndUpdate(
            { email },
            {
                token,
                resetPasswordToken: Date.now() + 5 * 60 * 1000
            },
            { new: true }
        );

        // create url
        const url = `http://localhost:3000/update-password/${token}`;

        // send mail containing the url
        await mailSender(email,
            `Password Reset Link`,
            `password Reset Link: ${url}`);

        // return response
        return res.json({
            success: true,
            messages: "Email sent Successfully, please check."
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "something went wrong while generating reset token"
        })
    }

}


// reset password
exports.resetPassword = async (req, res) => {
    try {
        // data fetch || token is given from frontend side in the body
        const { newPassword, confirmPassword, token } = req.body;

        // validation
        if (!newPassword || !confirmPassword || !token || newPassword !== confirmPassword) {
            return res.status(403).json({
                success: false,
                message: "please fil all the mandatory fields to reset password"
            })
        }

        // get user details using token
        const userDetails = await User.findOne({ token });

        // if no entry -> invalid token
        if (!userDetails) {
            return res.json({
                success: false,
                message: "token missing in the user db"
            })
        }

        //  token time check
        if (userDetails.resetPasswordExpires < Date.now()) {
            return res.json({
                success: false,
                message: "Token is missing || resetPassword"
            })
        }

        // hash password
        const hashedpassword = await bcrypt.hash(newPassword, 10);

        // update password
        await User.findOneAndUpdate(
            { token },
            { password: hashedpassword },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Password Reset Successful"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "something went wrong while reseting the token"
        })
    }
}