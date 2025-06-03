const AIController = require("../controller/AIController");
const { verifyToken } = require("../middleware");
const router = require("express").Router();

router.route("/chat").post(verifyToken, AIController.getAIStream);
router.route("/chat/generate-terms").post(verifyToken, AIController.generateTerms);
module.exports = router;
