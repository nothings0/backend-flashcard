const { default: slugify } = require("slugify");
const Exercise = require("../model/Exercise");
const axios = require("axios");

const API_YOUTUBE_INFO = "http://14.225.210.46:5005/youtube";

const ExerciseController = {
  // Create a new exercise
  createExercise: async (req, res, next) => {
    try {
      const {youtube_url, level} = req.body;

      const resp = await axios.post(API_YOUTUBE_INFO, {youtube_url})

      const data = resp.data.data;

      const slug = slugify(data.title, {
        lower: true,
        strict: true,
      });

      const thumbnail = data.thumbnail.replace("hqdefault.jpg", "hq720.jpg");
      const exercise = new Exercise({...data, thumbnail, slug, level: level || "BEGINNER"});

      const savedExercise = await exercise.save();
      res.status(201).json({
        message: "Exercise created successfully",
        exercise: savedExercise,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all exercises
  getAllExercises: async (req, res) => {
    try {
      const exercises = await Exercise.find().sort({ createdAt: -1 }).select("-subtitle");;
      res.status(200).json({
        message: "Exercises retrieved successfully",
        exercises,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving exercises", error: error.message });
    }
  },

  // Get a single exercise by ID
  getExerciseById: async (req, res) => {
    try {
      const { slug } = req.params;

      const exercise = await Exercise.findOne({slug});
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      res.status(200).json({
        message: "Exercise retrieved successfully",
        exercise,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error retrieving exercise", error: error.message });
    }
  },

  // Update a exercise by ID
  updateExercise: async (req, res) => {
    try {
      const { id } = req.params;
      const { slug, level } = req.body;

      const exercise = await Exercise.findById(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      // Update fields
      exercise.slug = slug !== undefined ? slug : exercise.slug;
      exercise.level = level !== undefined ? level : exercise.level;

      const updatedExercise = await exercise.save();
      res.status(200).json({
        message: "Exercise updated successfully",
        exercise: updatedExercise,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating exercise", error: error.message });
    }
  },

  // Delete a exercise by ID
  deleteExercise: async (req, res) => {
    try {
      const { id } = req.params;

      const exercise = await Exercise.findByIdAndDelete(id);

      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      res.status(200).json({ message: "Exercise deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error deleting exercise", error: error.message });
    }
  },
};

module.exports = ExerciseController;
