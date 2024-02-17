const express = require("express");
const cors = require("cors");
const cookieParse = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const app = express();

const userRoutes = require("./routes/User");
const courseRoutes = require("./routes/Course");
const paymentRoutes = require("./routes/Payments");
const profileRoutes = require("./routes/Profile");

const database = require("./config/database");
const { cloudinaryConnect } = require("./config/cloudinary");
const razorpay = require("./config/razorpay");
const fileUpload = require("express-fileupload");

const PORT = process.env.PORT || 4000;

// databse connect
database.connectdb();

// middleware use
app.use(cors({
    origin: "https://studynotion-azure.vercel.app/"
}))
app.use(express.json());
app.use(cookieParse());
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true
    })
);
app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp"
    })
)

//cloudinary connection
cloudinaryConnect();

//routes
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);

//default route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "your server is up and running"
    })
})

// activate server
app.listen(PORT, () => {
    console.log(`app is running at port${PORT}`)
})