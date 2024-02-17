const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const crypto = require("crypto")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const mongoose = require("mongoose")
const {
    courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const CourseProgress = require("../models/CourseProgress")

// Capture the payment and initiate the Razorpay order
exports.capturePayment = async (req, res) => {
    const { courses } = req.body
    const userId = req.user.id
    if (courses.length === 0) {
        return res.json({ success: false, message: "Please Provide Course ID" })
    }

    let total_amount = 0

    for (const course_id of courses) {
        let course
        try {
            // Find the course by its ID
            course = await Course.findById(course_id)

            // If the course is not found, return an error
            if (!course) {
                return res
                    .status(200)
                    .json({ success: false, message: "Could not find the Course" })
            }

            // Check if the user is already enrolled in the course
            const uid = new mongoose.Types.ObjectId(userId)
            if (course.studentsEnroled.includes(uid)) {
                return res
                    .status(200)
                    .json({ success: false, message: "Student is already Enrolled" })
            }

            // Add the price of the course to the total amount
            total_amount += course.price
        } catch (error) {
            console.log(error)
            return res.status(500).json({ success: false, message: error.message })
        }
    }

    const options = {
        amount: total_amount * 100,
        currency: "INR",
        receipt: Math.random(Date.now()).toString(),
    }

    try {
        // Initiate the payment using Razorpay
        const paymentResponse = await instance.orders.create(options)
        console.log(paymentResponse)
        res.json({
            success: true,
            data: paymentResponse,
        })
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .json({ success: false, message: "Could not initiate order." })
    }
}

// verify the payment
exports.verifyPayment = async (req, res) => {
    const razorpay_order_id = req.body?.razorpay_order_id
    const razorpay_payment_id = req.body?.razorpay_payment_id
    const razorpay_signature = req.body?.razorpay_signature
    const courses = req.body?.courses

    const userId = req.user.id

    if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !courses ||
        !userId
    ) {
        return res.status(200).json({ success: false, message: "Payment Failed" })
    }

    let body = razorpay_order_id + "|" + razorpay_payment_id

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex")

    if (expectedSignature === razorpay_signature) {
        await enrollStudents(courses, userId, res)
        return res.status(200).json({ success: true, message: "Payment Verified" })
    }

    return res.status(200).json({ success: false, message: "Payment Failed" })
}

// Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
    const { orderId, paymentId, amount } = req.body

    const userId = req.user.id

    if (!orderId || !paymentId || !amount || !userId) {
        return res
            .status(400)
            .json({ success: false, message: "Please provide all the details" })
    }

    try {
        const enrolledStudent = await User.findById(userId)

        await mailSender(
            enrolledStudent.email,
            `Payment Received`,
            paymentSuccessEmail(
                `${enrolledStudent.FirstName} ${enrolledStudent.LastName}`,
                amount / 100,
                orderId,
                paymentId
            )
        )
    } catch (error) {
        console.log("error in sending mail", error)
        return res
            .status(400)
            .json({ success: false, message: "Could not send email" })
    }
}

// enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
    if (!courses || !userId) {
        return res
            .status(400)
            .json({ success: false, message: "Please Provide Course ID and User ID" })
    }

    for (const courseId of courses) {
        try {
            // Find the course and enroll the student in it
            const enrolledCourse = await Course.findOneAndUpdate(
                { _id: courseId },
                { $push: { studentsEnroled: userId } },
                { new: true }
            )

            if (!enrolledCourse) {
                return res
                    .status(500)
                    .json({ success: false, error: "Course not found" })
            }
            console.log("Updated course: ", enrolledCourse)

            const courseProgress = await CourseProgress.create({
                courseID: courseId,
                userId: userId,
                completedVideos: [],
            })
            // Find the student and add the course to their list of enrolled courses
            const enrolledStudent = await User.findByIdAndUpdate(
                userId,
                {
                    $push: {
                        courses: courseId,
                        courseProgress: courseProgress._id,
                    },
                },
                { new: true }
            )

            console.log("Enrolled student: ", enrolledStudent)
            // Send an email notification to the enrolled student
            const emailResponse = await mailSender(
                enrolledStudent.email,
                `Successfully Enrolled into ${enrolledCourse.courseName}`,
                courseEnrollmentEmail(
                    enrolledCourse.courseName,
                    `${enrolledStudent.FirstName} ${enrolledStudent.LastName}`
                )
            )

            console.log("Email sent successfully: ", emailResponse.response)
        } catch (error) {
            console.log(error)
            return res.status(400).json({ success: false, error: error.message })
        }
    }
}





// const { instance } = require("../config/razorpay");
// const User = require("../models/User");
// const Course = require("../models/Course");
// const mailSender = require("../utils/mailSender");
// const { default: mongoose } = require("mongoose");


// // capture payment and initiate the Razorpay order
// exports.capturePayment = async (req, res) => {
//     // get course id and user id
//     const { course_id } = req.body;
//     const user_id = req.user.id;

//     // validation
//     // valid course id
//     if (!course_id || !user_id) {
//         return res.status(500).json({
//             success: false,
//             message: "Error While fetching course id or user id."
//         })
//     }

//     // valid course detail
//     let course;
//     try {
//         course = await Course.findById({ course_id })
//         if (!course) {
//             return res.json({
//                 success: false,
//                 message: "no course with given course id."
//             })
//         }

//         // user already paid for the same course
//         const uid = new mongoose.Types.ObjectId(user_id);
//         if (course.studentEnrolled.includes(uid)) {
//             return res.status(200).json({
//                 success: false,
//                 message: "student is already enrolled"
//             })
//         }

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             success: false,
//             message: "Error While fetching the course."
//         })
//     }

//     // create oreder
//     const amount = course.price * 100;
//     const currency = "INR";
//     const options = {
//         amount,
//         currency,
//         receipt: Math.random(Date.now()).toString(),
//         notes: {
//             courseId: course_id,
//             userId: user_id
//         }
//     };

//     try {
//         const paymentResponse = await instance.orders.create(options);
//         console.log(paymentResponse);

//         // send response
//         return res.status(200).json({
//             success: true,
//             CourseName: course.courseName,
//             CourseDescription: course.courseDescription,
//             OrderId: paymentResponse.id,
//             currency: paymentResponse.currency,
//             amount: paymentResponse.amount
//         })

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             success: false,
//             message: "unable to intiate order."
//         })
//     }
// }

// // verify Signature of Razorpay and Server
// exports.verifySignature = async (req, res) => {
//     const webhookSecret = "12345678";

//     const signature = req.header["x-razorpay-signature"];

//     const shasum = crypto.createHmac("sha256", webhookSecret);
//     shasum.update(JSON.stringify(req.body));
//     const digest = shasum.digest("hex");

//     if (signature === digest) {
//         console.log("payment is Authorised");

//         const { user_id, course_id } = req.body.payload.payment.entity.notes;

//         try {
//             // fulfil the action
//             // update course by adding student in course
//             const enrolledCourse = await Course.findOneAndUpdate(
//                 { _id: course_id },
//                 { $push: { studentEnrolled: user_id } },
//                 { new: true }
//             );

//             if (!enrolledCourse) {
//                 return res.status(500).json({
//                     success: false,
//                     message: "course not found"
//                 })
//             }

//             clg(enrolledCourse)

//             // update user by adding course in the user db
//             const enrolledStudent = await User.findOneAndUpdate(
//                 { _id: user_id },
//                 { $push: { courses: course_id } },
//                 { new: true }
//             );

//             if (!enrolledStudent) {
//                 return res.status(500).json({
//                     success: false,
//                     message: "student not found"
//                 })
//             }

//             clg(enrolledStudent)

//             // confirmation mail send]
//             const emailResponse = await mailSender(
//                 enrolledStudent.email,
//                 "Congratulation, you are onboarded to the new codenotion course", "mail body"
//             );
//             console.log(emailResponse);
//             return res.status(200).json({
//                 success: true,
//                 message: "signature verified and course added"
//             })

//         } catch (error) {
//             return res.status(500).json({
//                 success: false,
//                 message: error.message
//             })
//         }
//     }
//     else {
//         return res.status(500).json({
//             success: false,
//             message: "invalid request"
//         })
//     }
// }