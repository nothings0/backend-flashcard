const router = require("express").Router();
const BoardController = require("../../controller/Board/BoardController");
const { verifyToken } = require("../../middleware/index");

router
  .route("/")
  .get(verifyToken, BoardController.get)
  .post(verifyToken, BoardController.create);

router.route("/:boardId").put(verifyToken, BoardController.update);

module.exports = router;
