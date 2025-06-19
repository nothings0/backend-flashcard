const AffiliateController = require("../controller/AffiliateController");
const { verifyToken } = require("../middleware");
const router = require("express").Router();

router.get("/generate-for-all-users", AffiliateController.generateAffiliateForAllUsers);
router.route('/verify').get(verifyToken, AffiliateController.verify)

module.exports = router;
