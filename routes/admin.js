const express = require("express");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const AssignedLead = require("../models/AssignedLead");
const Lead=require("../models/Lead");

const router = express.Router();


// POST /api/admin/search-leads
router.post("/search-leads", async (req, res) => {
  const { searchCriteria, searchValue } = req.body;

  if (!searchCriteria || !searchValue) {
    return res.status(400).json({ message: "Missing search criteria or value" });
  }

  try {
    let query = {};

    // Handle boolean fields
    if (["is_interested", "is_onboarded"].includes(searchCriteria)) {
      query[searchCriteria] = searchValue.toLowerCase() === "yes";
    }
    // Regex for partial matches
    else if (["candidate_name", "email", "job_city", "company_name", "category"].includes(searchCriteria)) {
      query[searchCriteria] = { $regex: searchValue, $options: "i" };
    }
    // Exact match for others
    else {
      query[searchCriteria] = searchValue;
    }

    // Search in both AssignedLead and Lead
    const [assignedLeads, pendingLeads] = await Promise.all([
      AssignedLead.find(query),
      Lead.find(query)
    ]);

    const combinedResults = [...assignedLeads, ...pendingLeads];

    res.status(200).json(combinedResults);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Admin Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({ token });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});


router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({ message: "✅Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating password" });
  }
});

module.exports = router;
