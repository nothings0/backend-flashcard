const OpenaiController = require("../controller/OpenAI/OpenaiController");
const router = require("express").Router();

router.route("/").post(OpenaiController.addvice);

module.exports = router;
