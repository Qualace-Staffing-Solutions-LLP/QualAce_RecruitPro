const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  city: { type: String, required: true },
  qualification: { type: String, required: true },
  type: { type: String, enum: ['Recruiter', 'Developer'], required: true },
  recruiterId: { type: String, required: true },
  password: { type: String, required: true },
  ActiveLeads: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssignedLead'
    }
  ],
  inActiveLeads: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssignedLead'
    }
  ],
  assignedLeads: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssignedLead'
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
