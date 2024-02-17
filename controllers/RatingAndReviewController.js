const RatingAndReview = require("../models/RatingAndReview");
const Course = require("../models/Course");
const { default: mongoose } = require("mongoose");

// create rating
exports.createRating = async (req, res) => {
    try {
        // get user id
        const userId = req.user.id;

        // fetch data from req body
        const { courseId, rating, review } = req.body;

        // check if user is enrolled or not
        const courseDetails = await Course.findOne({ _id: courseId, studentEnrolled: { $elemMatch: { $eq: userId } } });
        if (!courseDetails) {
            return res.status(500).json({
                success: false,
                message: "student is not enrolled in the course."
            })
        }

        // check not already reviewed
        const alreadyReviewed = await RatingAndReview.findOne({ user: userId, course: courseId });
        if (alreadyReviewed) {
            return res.status(403).json({
                success: false,
                message: "already reviewed."
            })
        }

        // create review
        const ratingReview = await RatingAndReview.create({
            rating, review, course: courseId, user: userId
        });

        // update course 
        const updatedCourse = await Course.findByIdAndUpdate({ _id: courseId }, {
            $push: {
                ratingAndReview: ratingReview._id
            }
        }, { new: true });
        console.log(updatedCourse)
        // return respose 
        return res.status(200).json({
            success: true,
            message: "rating and review created successfully",
            ratingReview
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

//get average rating
exports.getAverageRating = async (req, res) => {
    try {
        //get course id
        const courseId = req.body.courseId;

        //calculate average rating
        const result = await RatingAndReview.aggregate([
            {
                $match: {
                    course: new mongoose.Types.ObjectId(courseId)
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" }
                }
            }
        ])

        //return response
        if (result.length > 0) {
            return res.status(200).json({
                success: true,
                averageRating: result[0].averageRating
            })
        }
        else {
            return res.status(200).json({
                success: false,
                averageRating: 0,
                message: "no average rating so average rating is 0."
            })
        }
    } catch (error) {

    }
}

//get all ratingand reviews
exports.getAllRating = async (req, res) => {
    try {

        const allReview = await RatingAndReview.find({}).sort({ rating: "desc" }).populate({
            path: "user",
            selct: "FirstName LastName email image"
        }).populate({
            path: "course",
            select: "courseName"
        }).exec();

        return res.status(200).json({
            success: true,
            message: "all rating fetched succesfully"
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

//get all ratingand reviews of a single course
// exports.getAllRating = async (req, res) => {
//     try {
//         const courseid = req.body.courseId;
//         const allReview = await RatingAndReview.find({ _id: courseid }).sort({ rating: "desc" }).populate({
//             path: "user",
//             selct: "FirstName LastName email image"
//         }).populate({
//             path: "course",
//             select: "courseName"
//         }).exec();

//         return res.status(200).json({
//             success: true,
//             message: "all rating fetched succesfully"
//         })

//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }