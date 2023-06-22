const router = require("express").Router();
const TaskController = require("../../controller/Board/TaskController");
const { verifyToken } = require("../../middleware/index");

router
  .route("/")
  .post(verifyToken, TaskController.create)
  .put(verifyToken, TaskController.updatePosition);

router
  .route("/:taskId")
  .put(verifyToken, TaskController.update)
  .delete(verifyToken, TaskController.delete);

module.exports = router;
