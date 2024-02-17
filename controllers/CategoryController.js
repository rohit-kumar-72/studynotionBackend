const Category = require("../models/Category");

function getRandomInt(max) {
    return Math.floor(Math.random() * max)
}

// creating a category
exports.createCategory = async (req, res) => {
    try {

        // fetch data from admin
        const { name, description } = req.body;

        //validating data
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "all fields are Required"
            })
        }

        // adding category to database
        const categoryDetails = await Category.create({
            name: name,
            description: description
        });
        console.log("added category Details ", categoryDetails);

        // respose send
        return res.status(200).json({
            success: true,
            message: "category created successfully."
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error While creating the category."
        })
    }
}


// fetching all Category
exports.showAllCategories = async (req, res) => {
    try {
        const allCategory = await Category.find({}, { name: true, description: true });
        return res.status(200).json({
            success: true,
            message: "all Category fetched successfully.",
            data: allCategory
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error While fetching all the category."
        })
    }
}

// Category page details
// exports.categoryPageDetails = async (req, res) => {
//     try {
//         // get categoryid
//         const { categoryId } = req.body;

//         // get courses for specified category id.
//         const selectedCategory = await Category.findById({ categoryId }).populate("courses").exec();

//         // validation
//         if (!selectedCourses) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Data not found"
//             })
//         }

//         // get courses of different category.
//         const differentCategory = await Category.find({
//             _id: { $ne: categoryId }
//         }).populate("courses").exec();

//         // get top selling courses

//         // return response
//         return res.status(200).json({
//             success: true,
//             data: {
//                 selectedCategory, differentCategory
//             }
//         })

//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

exports.categoryPageDetails = async (req, res) => {
    try {
        const { categoryId } = req.body

        // Get courses for the specified category
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: "ratingAndReviews",
            })
            .exec()

        console.log("SELECTED COURSE", selectedCategory)
        // Handle the case when the category is not found
        if (!selectedCategory) {
            console.log("Category not found.")
            return res
                .status(404)
                .json({ success: false, message: "Category not found" })
        }
        // Handle the case when there are no courses
        if (selectedCategory.courses.length === 0) {
            console.log("No courses found for the selected category.")
            return res.status(404).json({
                success: false,
                message: "No courses found for the selected category.",
            })
        }

        // Get courses for other categories
        const categoriesExceptSelected = await Category.find({
            _id: { $ne: categoryId },
        })
        let differentCategory = await Category.findOne(
            categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
                ._id
        )
            .populate({
                path: "courses",
                match: { status: "Published" },
            })
            .exec()
        console.log()
        // Get top-selling courses across all categories
        const allCategories = await Category.find()
            .populate({
                path: "courses",
                match: { status: "Published" },
            })
            .exec()
        const allCourses = allCategories.flatMap((category) => category.courses)
        const mostSellingCourses = allCourses
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 10)

        res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCategory,
                mostSellingCourses,
            },
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        })
    }
}