const mongoose = require("mongoose");

const AssignedLeadSchema = new mongoose.Schema({
  lead_id: { type: String, required: true },
  candidate_name: { type: String, required: true },
  phone_number: { type: String, required: true },
  email: { type: String, required: true },
  job_city: String,
  job_area: String,
  gender: String,
  age: Number,
  applied_on: Date,
  candidate_city: String,
  candidate_area: String,
  education: String,
  highest_degree: String,
  assigned_to: String,
  is_interested: Boolean,
  not_interested_reason: String,
  category: String,
  is_onboarded: Boolean,
  company_id: String,
  company_name: String,
  is_Active: Boolean,
  follow_ups: [
    {
      date: Date,
      text: String
    }
  ],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AssignedLead", AssignedLeadSchema);
