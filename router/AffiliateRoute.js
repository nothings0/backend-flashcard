const AffiliateController = require("../controller/AffiliateController");
const { verifyToken, verifyAdmin } = require("../middleware");
const router = require("express").Router();

router.get("/generate-for-all-users", AffiliateController.generateAffiliateForAllUsers);
router.route('/verify').get(verifyToken, AffiliateController.verify)
router.route('/get-affiliate-info').get(verifyToken, AffiliateController.getAffiliateInfo)
router.route('/withdraw').post(verifyToken, AffiliateController.requestWithdrawal)
router.route('/admin/withdraw/:id').get(verifyAdmin, AffiliateController.getRequestWithdrawal)
router.route('/admin/withdraws').get(verifyAdmin, AffiliateController.getRequestWithdrawals)
router.route('/bank-account').post(verifyToken, AffiliateController.updateBankAccount)
router.route('/history-withdraw').get(verifyToken, AffiliateController.getUserWithdrawals)

module.exports = router;
