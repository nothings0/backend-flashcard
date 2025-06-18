const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  title: {
    type: String,
    default: ""
  },
  thumbnail: {
    type: String,
    default: ""
  },
  subtitle: [
    {
      text: {
        type: String,
        default: ""
      },
      time: {
        type: Number,
        default: ""
      },
      translation: {
        type: String,
        default: ""
      }
    }
  ],
  slug: {
    type: String,
    default: ""
  },
  level: {
    type: String,
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
    default: 'BEGINNER'
  }
}, { timestamps: true });

module.exports = mongoose.model('Exercise', ExerciseSchema);
