const express = require("express");
const app = express();
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const Student = require("./models/Student");

// Configure app
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/studentdb";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// ========== ROUTES ==========

// Home page - List all students
app.get("/", async (req, res) => {
  try {
    const students = await Student.find();
    res.render("home", { students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).send("Error loading students");
  }
});

// Show form to add new student
app.get("/students/new", (req, res) => {
  res.render("add");
});

// Create new student
app.post("/students", async (req, res) => {
  try {
    const { name, age, course, email } = req.body;
    const newStudent = new Student({ name, age, course, email });
    await newStudent.save();
    res.redirect("/");
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).send("Error creating student");
  }
});

// Show single student
app.get("/students/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).send("Student not found");
    }
    res.render("see", { student });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).send("Error loading student");
  }
});

// Show edit form
app.get("/students/:id/edit", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).send("Student not found");
    }
    res.render("edit", { student });
  } catch (error) {
    console.error("Error fetching student for edit:", error);
    res.status(500).send("Error loading edit form");
  }
});

// Update student
app.put("/students/:id", async (req, res) => {
  try {
    const { name, age, course, email } = req.body;
    await Student.findByIdAndUpdate(req.params.id, { name, age, course, email });
    res.redirect("/");
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).send("Error updating student");
  }
});

// Delete student
app.delete("/students/:id", async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).send("Error deleting student");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Visit: http://localhost:${PORT}`);
});