const AdminController = require("../controller/AdminController");
const { verifyAdmin } = require("../middleware");
const router = require("express").Router();

router.route("/").get(AdminController.statistical)
module.exports = router;
