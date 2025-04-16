const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  company_name: {
    type: String,
    required: true,
    unique: true,
  },
  working_leads: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssignedLead",
    },
  ],
});

module.exports = mongoose.model("Client", clientSchema);
