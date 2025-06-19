const PricingController = require("../controller/PricingController");
const { verifyAdmin } = require("../middleware");
const router = require("express").Router();

router.route("/").get(PricingController.getPrices).post(verifyAdmin, PricingController.createPrice);
router.route("/:id").get(PricingController.getPrice).delete(verifyAdmin, PricingController.deletePrice).patch(verifyAdmin, PricingController.updatePrice);
module.exports = router;
