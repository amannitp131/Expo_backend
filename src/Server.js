const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');

const GridFsStorage = require("multer-gridfs-storage").GridFsStorage;
const Grid = require("gridfs-stream");
const path = require("path");
const fs = require("fs");



// Import models
const User = require("./models/User");
const Project = require("./models/Project");





const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: '80mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


let otpStore = {};
mongoose
  .connect("mongodb+srv://amanmug23cs:T2MeQhO7LuKe81v5@cluster0.q7qv0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB:", error);
  });

const mongoURI = "mongodb://localhost:27017/Expo";
const conn = mongoose.connection;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hellocollege143@gmail.com",
    pass: "bnnv adcu kdoq bhvp",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

app.post("/signup", async (req, res) => {
  const { name, email, password, branch, gender, instituteName, year } =
    req.body;

  if (
    !name ||
    !email ||
    !password ||
    !branch ||
    !gender ||
    !instituteName ||
    !year
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "user already registered", status: false });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      branch,
      gender,
      instituteName,
      year,
    });

    await newUser.save();

    res
      .status(201)
      .json({ message: "User created successfully.", status: true });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "internal server error.please try again after some time !!",
        status: false,
      });
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "All fields are required", status: false });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid email or password", status: false });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ message: "Invalid email or password", status: false });
    }

    res
      .status(200)
      .json({
        message: "Login successful",
        status: true,
        user: { id: user._id, name: user.name, email: user.email },
      });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal server error", status: false });
  }
});

app.post("/request-otp", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send("Email is required");
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  const mailOptions = {
    from: "akashchandra7281@gmail.com",
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}`,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Error sending OTP", status: false });
    } else {
      otpStore[email] = otp;
      console.log(`Stored OTP for ${email}: ${otpStore[email]}`); // Debug log
      return res
        .status(200)
        .json({ message: "OTP sent successfully", status: true });
    }
  });
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  if (otpStore[email] && otpStore[email] === otp) {
    delete otpStore[email]; // Optionally delete the OTP after successful verification
    return res
      .status(200)
      .json({ message: "OTP verified successfully", status: true });
  } else {
    return res
      .status(400)
      .json({ message: "otp did not match!!!", status: false });
  }
});

app.post("/addskill", async (req, res) => {
  try {
    const { email, skill } = req.body;
    if (!email || !skill) {
      return res.status(400).json({ message: "Email and skill are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (!user.skills.includes(skill)) {
      user.skills.push(skill); // Add the skill
      await user.save(); // Save the updated user
      return res
        .status(200)
        .json({ message: "Skill added successfully.", status: true });
    } else {
      return res.status(400).json({ message: "Skill already exists." });
    }
  } catch (error) {
    console.error("Error adding skill:", error);
    return res
      .status(500)
      .json({ message: "Internal server error.", status: false });
  }
});
app.get("/getskill", async (req, res) => {
  const email = req.headers.email; // Ensure email is passed in headers
  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    return res.status(400).json({ message: "User not found", status: false });
  }

  const skills = existingUser.skills; // Access the skills array

  return res
    .status(200)
    .json({ message: "Skills found successfully!", skills, status: true });
});

app.post("/addachievement", async (req, res) => {
  const email = req.body.email;
  if (!email) {
    return res
      .status(400)
      .json({ message: "user not logged in or signup", status: false });
  }
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(400).json({ message: "user not found", status: false });
  }
  const { title, date, description } = req.body;
  if (!title || !description || !date) {
    return res
      .status(400)
      .json({ message: "all fields are required !", status: false });
  }

  const newAchievement = { title, date, description };

  existingUser.achievement.push(newAchievement);

  await existingUser.save();

  return res
    .status(200)
    .json({ message: "your achievement added successfully!!!", status: true });
});

app.get("/achievements", async (req, res) => {
  try {
    const email = req.headers.email;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Email not provided", status: false });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    if (!existingUser.achievement) {
      return res
        .status(200)
        .json({
          achievements: [],
          message: "No achievements found",
          status: true,
        });
    }

    return res
      .status(200)
      .json({ achievements: existingUser.achievement, status: true });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
});

app.post("/addexperience", async (req, res) => {
  const email = req.body.email;
  if (!email) {
    return res
      .status(400)
      .json({ message: "user not logged in or signup", status: false });
  }
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(400).json({ message: "user not found", status: false });
  }
  const { company, position, duration, description } = req.body;
  if (!company || !description || !duration || !position) {
    return res
      .status(400)
      .json({ message: "all fields are required !", status: false });
  }

  const newExperience = { company, position, duration, description };

  existingUser.experience.push(newExperience);

  await existingUser.save();

  return res
    .status(200)
    .json({ message: "your Experience  added successfully!!!", status: true });
});

app.get("/experiences", async (req, res) => {
  try {
    const email = req.headers.email;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Email not provided", status: false });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    if (!existingUser.experience) {
      return res
        .status(200)
        .json({ experiences: [], message: "No experience", status: true });
    }

    return res
      .status(200)
      .json({ experiences: existingUser.experience, status: true });
  } catch (error) {
    console.error("Error fetching experiences:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
});

app.get("/getdata", async (req, res) => {
  const email = req.headers.email;
  if (!email) {
    return res
      .status(400)
      .json({ message: "user is not signed or logged in!!", status: false });
  }

  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(404).json({ message: "User not found", status: false });
  }

  return res.status(200).json({ message: existingUser, status: true });
});

const multer = require("multer");
const upload = multer(); // Use default multer settings

app.post("/addproject", upload.array("images"), async (req, res) => {
  try {
    const email = req.body.email; // Now this should correctly receive the email

    if (!email) {
      return res.status(400).json({ message: "Invalid email", status: false });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    const { title, description, technologies, githubLink, liveDemoLink, category, tags } = req.body;

    const imageIds = [];
    if (req.files && req.files.length > 0) {
      for (let image of req.files) {
        const ext = image.mimetype.split('/')[1]; // Get the image extension
        const filename = `image-${Date.now()}.${ext}`;
        const filePath = path.join(__dirname, 'uploads', filename);
        fs.writeFileSync(filePath, image.buffer); // Write the image buffer to file
        imageIds.push(filePath);
      }
    }

    const newProject = new Project({
      title,
      description,
      technologies: technologies.split(","),
      githubLink,
      liveDemoLink,
      category,
      tags: tags.split(","),
      images: imageIds,
      email,
    });

    await newProject.save();
    res.status(200).json({ message: "Project added successfully!", status: true });
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).json({ message: "Error adding project" });
  }
});


app.get("/myproject", async (req, res) => {
  try {
    const email = req.headers.email; // Ensure email is sent in headers
    console.log(email);

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ message: "User not logged in or signed up!", status: false });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    // Fetch projects associated with the user
    const projects = await Project.find({ email });

    // Transform projects to ensure image paths are relative URLs
    const transformedProjects = projects.map(project => ({
      ...project.toObject(), // Convert mongoose document to plain object
      images: project.images.map(image => `/uploads/${path.basename(image)}`) // Modify this to match your server's structure
    }));

    // Return the projects or an empty array if none found
    return res.status(200).json({ message: transformedProjects.length ? transformedProjects : [], status: true });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ message: "Error fetching projects", status: false });
  }
});

app.get("/allproject", async (req, res) => {
  const allProjects = await Project.find({});

  // Transform projects to ensure image paths are relative URLs
  const transformedProjects = allProjects.map(project => ({
    ...project.toObject(), // Convert mongoose document to plain object
    images: project.images.map(image => `/uploads/${path.basename(image)}`) // Modify this to match your server's structure
  }));

  // Return the projects or an empty array if none found
  return res.status(200).json({ message: transformedProjects.length ? transformedProjects : [], status: true });
}
);

app.post("/addlike", async (req, res) => {
  const email = req.headers.email;
  if (!email) {
    return res.status(400).json({ message: "Please login or signup to like a project!", status: false });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "User not found. Please signup!", status: false });
    }

    const projectId = req.headers.id;
    const existingProject = await Project.findOne({ projectId });

    if (!existingProject) {
      return res.status(400).json({ message: "Project not found!", status: false });
    }


    if (existingProject.likes.includes(email)) {
      return res.status(400).json({ message: "You have already liked this project.", status: false });
    }

    existingProject.likes.push(email);
    await existingProject.save();

    return res.status(200).json({ message: "Project liked successfully!", status: true });
  } catch (error) {
    console.error("Error liking project:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
});


app.post("/addcomment", async (req, res) => {
  const email = req.headers.email;
  if (!email) {
    return res.status(400).json({ message: "Please login or signup to comment on a project!", status: false });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "User not found. Please signup!", status: false });
    }

    const projectId = req.headers.id;
    const existingProject = await Project.findOne({ projectId });
    if (!existingProject) {
      return res.status(400).json({ message: "Project not found!", status: false });
    }

    // Extract comment from request body
    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ message: "Comment is required!", status: false });
    }

    // Create a new comment
    const newComment = { email, comment };

    // Add comment to the project's comments array
    existingProject.comments.push(newComment);
    await existingProject.save();

    return res.status(200).json({ message: "Comment added successfully!", status: true, comments: existingProject.comments });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ message: "Internal server error", status: false });
  }
});



// Endpoint to view another user's dashboard
app.get("/viewdashboard", async (req, res) => {

  const email = req.query.email;


  if (!email) {
    return res
      .status(400)
      .json({ message: "Target user's email not provided", status: false });
  }

  try {
    // Fetch the user data
    const user = await User.findOne({ email }).lean(); // Use .lean() to get a plain object
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Fetch the user's projects
    const projects = await Project.find({ email }).lean();
    const transformedProjects = projects.map((project) => ({
      ...project,
      images: project.images.map((image) => `/uploads/${path.basename(image)}`),
    }));

    // Construct the dashboard data
    const dashboardData = {
      user: {
        name: user.name,
        branch: user.branch,
        gender: user.gender,
        instituteName: user.instituteName,
        year: user.year,
        skills: user.skills || [],
        achievements: user.achievement || [],
        experiences: user.experience || [],
      },
      projects: transformedProjects,
    };

    return res.status(200).json({
      message: "User dashboard fetched successfully",
      data: dashboardData,
      status: true,
    });
  } catch (error) {
    console.error("Error fetching user dashboard:", error);
    return res.status(500).json({ message: "Server error", status: false });
  }
});






const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
