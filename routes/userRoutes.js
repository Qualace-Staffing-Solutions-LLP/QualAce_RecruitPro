const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Import User model
const router = express.Router();

// GET /api/users/search?criteria=recruiterId&value=123
router.get("/search", async (req, res) => {
  const { criteria, value } = req.query;

  if (!criteria || !value) {
    return res.status(400).json({ message: "Missing search criteria or value." });
  }

  const validFields = ["recruiterId", "fullName", "mobileNumber", "city"];
  if (!validFields.includes(criteria)) {
    return res.status(400).json({ message: "Invalid search criteria." });
  }

  try {
    const query = {};
    query[criteria] = value;

    const employee = await User.findOne(query)
  .populate('assignedLeads')
  .populate('ActiveLeads')
  .populate('inActiveLeads');

    if (!employee) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    res.json(employee);
  } catch (error) {
    console.error("Error searching recruiter:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});


// Create User Endpoint
router.post('/create', async (req, res) => {
  const { fullName, mobileNumber, city, qualification, type, recruiterId, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ recruiterId: recruiterId });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this Recruiter ID already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      fullName,
      mobileNumber,
      city,
      qualification,
      type,
      recruiterId,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: '✅User created successfully', user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});


// Update employee details
router.put("/:id", async (req, res) => {
  try {
    const updatedEmployee = await User.findOneAndUpdate(
      { recruiterId: req.params.id },
      req.body,
      { new: true } // Return the updated document
    );
    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: "Error updating employee", error });
  }
});

// Delete employee
router.delete("/:id", async (req, res) => {
  try {
    const deletedEmployee = await User.findOneAndDelete({ recruiterId: req.params.id });
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "✅Employee deleted successfully" });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: "Error deleting employee", error });
  }
});

router.post("/reset-password", async (req, res) => {
  const { recruiterId, newPassword } = req.body;

  try {
    const user = await User.findOne({ recruiterId });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "✅Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating password" });
  }
});


router.get('/get-active-leads/:recruiterId', async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const user = await User.findOne({ recruiterId })
      .populate('ActiveLeads');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ activeLeads: user.ActiveLeads });
  } catch (error) {
    console.error("Error fetching active leads:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/get-inactive-leads/:recruiterId', async (req, res) => {
  try {
    const { recruiterId } = req.params;

    const user = await User.findOne({ recruiterId })
      .populate('inActiveLeads');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ inactiveLeads: user.inActiveLeads });
  } catch (error) {
    console.error("Error fetching active leads:", error);
    res.status(500).json({ message: "Server Error" });
  }
});


router.get('/recruiters', async (req, res) => {
  try {
    const recruiters = await User.find({ type: 'Recruiter' });
    res.json(recruiters);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
