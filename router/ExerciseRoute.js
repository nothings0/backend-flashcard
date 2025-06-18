const express = require('express');
const router = express.Router();
const exerciseController = require('../controller/ExerciseController');

router.post('/', exerciseController.createExercise);
router.get('/', exerciseController.getAllExercises);
router.get('/:slug', exerciseController.getExerciseById);
router.patch('/:id', exerciseController.updateExercise);
router.delete('/:id', exerciseController.deleteExercise);

module.exports = router;