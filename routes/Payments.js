const express = require("express");
const router = express.Router();

const { capturePayment, sendPaymentSuccessEmail, verifyPayment } = require("../controllers/Payment");
const { auth, isInstructor, isStudent } = require("../middlewares/auth");
router.post("/capturePayment", auth, isStudent, capturePayment);
router.post("verifySignature", verifyPayment);
router.post("sendPaymentSuccessEmail", sendPaymentSuccessEmail);

module.exports = router;