const AIController = require("../controller/AIController");
const { verifyToken } = require("../middleware");
const router = require("express").Router();

router.route("/chat").post(verifyToken, AIController.getAIStream);
module.exports = router;
