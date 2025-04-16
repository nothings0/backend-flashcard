const AdminController = require("../controller/AdminController");
const { verifyAdmin } = require("../middleware");
const router = require("express").Router();

router.route("/").get(AdminController.statistical)
router.route("/chart").get(AdminController.chartData)
module.exports = router;
