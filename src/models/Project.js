const mongoose = require('mongoose');
const Counter= require("./counter");
const CommentSchema = new mongoose.Schema({
  email: { type: String, required: true },
  comment: { type: String, required: true },
});
const ProjectSchema = new mongoose.Schema({
  projectId: { type: Number, unique: true },
  email: { type: String, required: true, ref: 'User' }, // Reference to User email
  title: { type: String, required: true },
  description: { type: String },
  images: [String], // Array of URLs for project images
  technologies: [String], // E.g., ["React", "MongoDB"]
  githubLink: { type: String },
  liveDemoLink: { type: String },
  awards: [
    {
      title: String,
      date: Date,
      description: String
    }
  ],
  category: { type: String }, // E.g., "Web Development"
  tags: [String], // Technology tags, e.g., ["React", "Python"]
  likes: { type: [String], default: [] },
  comments: [CommentSchema],
});

ProjectSchema.pre('save', async function (next) {
  const doc = this;
  
  if (doc.isNew) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { id: 'projectId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      doc.projectId = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Project', ProjectSchema);
