const ActiveController = require("../controller/ActiveController");
const { verifyToken } = require("../middleware");
const router = require("express").Router();

router.route("/").get(verifyToken, ActiveController.getActive);
router.route("/achieve").get(ActiveController.getAchieve);
router.route("/rank").get(ActiveController.getRankLearn);
module.exports = router;
