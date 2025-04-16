const express = require("express");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const AssignedLead = require("../models/AssignedLead");

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

    const leads = await AssignedLead.find(query);
    res.status(200).json(leads);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Internal server error" });
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
