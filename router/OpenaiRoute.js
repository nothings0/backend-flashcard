const OpenaiController = require("../controller/OpenAI/openaiController");
const router = require("express").Router();

router.route("/").post(OpenaiController.addvice);

module.exports = router;
