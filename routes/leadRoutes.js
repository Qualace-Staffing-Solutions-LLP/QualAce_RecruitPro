const express = require("express");
const router = express.Router();
const User=require("../models/User");
const Lead = require("../models/Lead"); // Lead Schema
const AssignedLead = require("../models/AssignedLead"); // AssignedLead Schema
const Client=require("../models/Client");
const multer = require("multer");
const xlsx = require("xlsx");

// Multer setup for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });



// Route to get all pending leads (i.e., all leads in Lead schema)
router.get("/pending-leads", async (req, res) => {
  try {
    const pendingLeads = await Lead.find().sort({ created_at: -1 }); // Fetch all leads

    res.status(200).json(pendingLeads); // ✅ Always return 200 OK
  } catch (error) {
    console.error("Error fetching pending leads:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/dashboard-stats", async (req, res) => {
  try {
    const active = await AssignedLead.countDocuments({ is_Active: true });
    const inactive = await AssignedLead.countDocuments({ is_Active: false });
    const pending = await Lead.countDocuments();

    const users = await User.find({ type: 'Recruiter' }).populate(['assignedLeads', 'ActiveLeads']);
    const recruiters = users.map(user => ({
      name: user.fullName,
      assigned: user.assignedLeads.length,
      active: user.ActiveLeads.length
    }));

    // Get daily lead counts (for last 7 days)
    const recentLeads = await Lead.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$created_at" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const timeline = recentLeads.map(item => ({
      date: item._id,
      count: item.count
    }));

    res.json({ active, inactive, pending, recruiters, timeline });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});


// Route to assign the latest unassigned lead to a recruiter
router.post("/assign-lead/:rid", async (req, res) => {
  try {
    const { rid } = req.params;
    const recruiter = await User.findOne({ recruiterId: rid });

    // Find the latest unassigned lead (LIFO - Last In First Out)
    const lead = await Lead.findOne({ assigned_to: null }).sort({ created_at: -1 });

    if (!lead) {
      return res.status(404).json({ message: "No unassigned leads available." });
    }

    // Assign recruiter ID to the lead
    lead.assigned_to = rid;
    if (recruiter) {
      recruiter.assignedLeads.push(lead._id);
      recruiter.inActiveLeads.push(lead._id);
      await recruiter.save();
    }

    // Move lead to assigned_leads schema
    const assignedLead = new AssignedLead(lead.toObject());
    await assignedLead.save();

    // Remove the lead from the leads collection
    await Lead.deleteOne({ _id: lead._id });

    res.status(200).json({ message: "✅Lead assigned successfully", assignedLead });
  } catch (error) {
    console.error("Error assigning lead:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Route to update is_interested and category fields
router.put("/update-lead/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_interested, category, is_onboarded, is_Active, rid , company_id, not_interested_reason, company_name} = req.body;
    const recruiter = await User.findOne({ recruiterId: rid });
    const updateData = {};

    if (typeof is_interested !== "undefined") {
      updateData.is_interested = is_interested;
    }

    if (typeof is_onboarded !== "undefined") {
      updateData.is_onboarded = is_onboarded;
    }

    if (typeof is_Active !== "undefined") {
      updateData.is_Active = is_Active;
      if (recruiter) {
        recruiter.ActiveLeads.push(id);
        recruiter.inActiveLeads.pop(id);
        await recruiter.save();
      }
    }

    if (typeof category !== "undefined" && category !== null && category !== "") {
      updateData.category = category;
    }

    if (typeof company_id !== "undefined" && company_id !== null && company_id !== "") {
      updateData.company_id = company_id;
    }

    if (typeof company_name !== "undefined" && company_name !== null && company_name !== "") {
      updateData.company_name = company_name;
    }

    if (typeof not_interested_reason !== "undefined" && not_interested_reason !== null && not_interested_reason !== "") {
      updateData.not_interested_reason = not_interested_reason;
    }
    

    console.log(`Updating lead with ID: ${id}`, updateData);

    const updatedLead = await AssignedLead.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ message: "✅Lead updated successfully", updatedLead });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:searchLeadId", async (req, res) => {
  try {
    const lead = await AssignedLead.findOne({ lead_id: req.params.searchLeadId });
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    res.status(200).json(lead);
  } catch (err) {
    console.error("Error fetching lead:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// PUT /api/leads/add-followup/:id
router.put("/add-followup/:id", async (req, res) => {
  const { id } = req.params;
  const { follow_up_text } = req.body;
  try {
    const lead = await AssignedLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ msg: "Lead not found" });

    lead.follow_ups.push({
      text: follow_up_text,
      date: new Date(),
    });

    await lead.save();
    res.status(200).json({ msg: "✅Follow-up added", lead });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});


function parseAppliedDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Remove timezone name (like "IST")
  const cleaned = dateStr.replace(/ [A-Z]+$/, '');

  const parsedDate = new Date(cleaned);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

// Utility function to generate a unique lead_id
const generateLeadId = () => `LEAD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

router.post("/bulk-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    // Generate potential leads from Excel
    const leadsFromExcel = jsonData.map((row) => {
      return {
        lead_id: generateLeadId(),
        candidate_name: row["Candidate Name"]?.trim() || "N/A",
        phone_number: row["Phone number"]?.trim() || "N/A",
        email: row["Email ID"] || "N/A",
        job_city: row["Job city"] || null,
        job_area: row["Job Area"] || null,
        gender: row["Gender"] || null,
        age: Number(row["Age"]) || null,
        applied_on: parseAppliedDate(row["Applied on"]),
        candidate_city: row["Candidate city"] || null,
        candidate_area: row["Candidate Area"] || null,
        education: row["Education"] || null,
        highest_degree: row["Highest Degree"] || null,
        assigned_to: null,
        is_interested: false,
        not_interested_reason: null,
        category: null,
        is_onboarded: false,
        company_id: null,
        is_Active: false,
        follow_ups: [],
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    // Build filter to check for duplicates
    const namePhonePairs = leadsFromExcel.map(lead => ({
      candidate_name: lead.candidate_name,
      phone_number: lead.phone_number
    }));

    // Find already existing leads
    const existingLeads = await Lead.find({
      $or: namePhonePairs.map(({ candidate_name, phone_number }) => ({
        candidate_name,
        phone_number
      }))
    });

    const existingSet = new Set(
      existingLeads.map(lead => `${lead.candidate_name}_${lead.phone_number}`)
    );

    // Filter out duplicates
    const newLeads = leadsFromExcel.filter(lead => {
      const key = `${lead.candidate_name}_${lead.phone_number}`;
      return !existingSet.has(key);
    });

    // Insert only non-duplicates
    if (newLeads.length > 0) {
      await Lead.insertMany(newLeads);
    }

    res.status(200).json({
      message: `✅ Upload completed. ${newLeads.length} new leads added, ${leadsFromExcel.length - newLeads.length} duplicates skipped.`,
    });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Server error. Failed to upload leads." });
  }
});


// Route to get all pending (unassigned) leads
// Route to get all pending (unassigned) leads







// POST /api/leads/search
router.post("/search", async (req, res) => {
  try {
    const { recruiterId, searchCriteria, searchValue } = req.body;

    if (!recruiterId || !searchCriteria || !searchValue) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ recruiterId }).populate("assignedLeads");

    if (!user) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    const leads = user.assignedLeads.filter((lead) => {
      const value = lead[searchCriteria];

      if (typeof value === "boolean") {
        return searchValue.toLowerCase() === "yes" ? value : !value;
      }

      if (typeof value === "string") {
        return value.toLowerCase().includes(searchValue.toLowerCase());
      }

      return false;
    });

    res.json({ leads });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});






module.exports = router;
