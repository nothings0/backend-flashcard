const AIController = require("../controller/AIController");
const { verifyToken } = require("../middleware");
const router = require("express").Router();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
router.route("/chat").post(verifyToken, upload.single('audio'), AIController.getAIStream);
module.exports = router;
