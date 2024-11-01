const mongoose = require('mongoose');
const Counter= require("./counter");
const UserSchema = new mongoose.Schema({
  userId: { type: Number, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // Ensure this is unique
  password: { type: String, required: true },
  year: { type: Number, required: true }, // e.g., 2024 for graduation year
  branch: { type: String, required: true }, // e.g., Computer Science
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  instituteName: { type: String, required: true }, // e.g., "XYZ University"

  achievement: [
    {
      title: String,
      date: Date,
      description: String
    }
  ],
  skills: [],

  experience: [
    {
      company: String,
      position: String,
      duration: String,
      description: String
    }
  ]
  
});

UserSchema.pre('save', async function (next) {
  const doc = this;

  if (doc.isNew) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { id: 'userId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      doc.userId = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('User', UserSchema);
