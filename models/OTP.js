const { default: mongoose } = require("mongoose");
const mailSender = require("../utils/mailSender")

const OTPSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    }
});

// a function to send mail
const sendVerificationEmail = async function (email, otp) {
    try {
        const mailResponse = await mailSender(email, "Verification email from StudyNotion", otp)
        console.log("Email sent Successfully: ", mailResponse)
    } catch (error) {

    }
}

OTPSchema.pre("save", async function (next) {
    await sendVerificationEmail(this.email, this.otp);
    next();
});

module.exports = mongoose.model("OTP", OTPSchema);