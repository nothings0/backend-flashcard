const AdminController = require("../controller/AdminController");
const { verifyAdmin } = require("../middleware");
const router = require("express").Router();

router.route("/").get(verifyAdmin, AdminController.statistical)
router.route("/recentIncome").get(AdminController.recentIncome)
router.route("/cards").get(AdminController.getCards)
module.exports = router;
