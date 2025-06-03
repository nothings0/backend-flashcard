const InvoiceController = require("../controller/InvoiceController");
const { verifyAdmin, verifyToken } = require("../middleware");
const router = require("express").Router();

router.route("/").post(verifyToken, InvoiceController.createInvoice)
router.route("/admin").get(verifyAdmin, InvoiceController.getInvoices)
router.route("/:id").get(verifyToken, InvoiceController.getInvoice)
router.route("/webhook-sepay").post(InvoiceController.webhooksepay);
module.exports = router;
