const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  cumulativeScore: { type: Number, required: true },
  cumulativeMax: { type: Number, required: true },
  cumulativePct: { type: Number, required: true },
  finalPercentile: { type: Number, required: true },
  rank: { type: Number, required: true },
  grade: { type: String, required: true },
  
  // Store quiz marks dynamically as an object
  quizScores: { type: Map, of: Number },
  quizPercentages: { type: Map, of: Number },
  
  // Store module marks dynamically as objects
  moduleScores: { type: Map, of: Number },
  modulePercentages: { type: Map, of: Number },
  modulePercentiles: { type: Map, of: Number },
  
  // ML Predictions
  predictedScore: { type: Number, default: null },
  predictedGrade: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
