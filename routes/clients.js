const express = require("express");
const router = express.Router();
const Client = require("../models/Client");
const AssignedLead = require("../models/AssignedLead");


// GET /api/clients/lead-distribution
router.get("/lead-distribution", async (req, res) => {
  try {
    const clients = await Client.find({}).populate("working_leads");

    const distribution = clients.map((client) => ({
      company: client.company_name,
      count: client.working_leads.length,
    }));

    res.status(200).json(distribution);
  } catch (error) {
    console.error("Error fetching client lead distribution:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/clients/add-lead
router.post("/add-lead", async (req, res) => {
  try {
    const { leadId, company_name} = req.body;

    if (!leadId || !company_name) {
      return res.status(400).json({ message: "Missing leadId or companyName" });
    }

    // Find or create client
    let client = await Client.findOne({ company_name: company_name });

    if (!client) {
      client = new Client({
        company_name: company_name,
        working_leads: [leadId],
      });
    } else {
      // Avoid duplicates
      if (!client.working_leads.includes(leadId)) {
        client.working_leads.push(leadId);
      }
    }

    await client.save();

    res.status(200).json({ message: "Lead added to client successfully✅", client });
  } catch (err) {
    console.error("Error in add-lead:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const clients = await Client.find().populate("working_leads");
    res.status(200).json(clients);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ message: "Error fetching clients", error: err });
  }
});

module.exports = router;
