const AIController = require("../controller/AIController");
const { verifyToken } = require("../middleware");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = require("express").Router();

router.route("/chat").post(verifyToken, AIController.getAIStream);
router.route("/chat/generate-terms").post(verifyToken, AIController.generateTerms);

router.post("/voice", verifyToken, upload.single("audio"), AIController.tts);
module.exports = router;
