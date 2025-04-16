require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require("./routes/admin");
const leadRoutes = require("./routes/leadRoutes");
const clientRoutes = require("./routes/clients");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use("/api/admin", adminRoutes);
app.use('/api/leads', leadRoutes);
app.use("/api/clients", clientRoutes);



// MongoDB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'MONGO_URI=mongodb+srv://QualAce:Qualace%402024@cluster0.teaz73k.mongodb.net/QualAce_RecruitPro?retryWrites=true';

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error(err));


  