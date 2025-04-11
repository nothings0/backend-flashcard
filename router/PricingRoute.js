const PricingController = require("../controller/PricingController");
const { verifyAdmin } = require("../middleware");
const router = require("express").Router();

router.route("/").get(PricingController.getPrices).post(verifyAdmin, PricingController.createPrice).put(verifyAdmin, PricingController.updatePrice);
router.route("/:id").delete(verifyAdmin, PricingController.deletePrice);
module.exports = router;
