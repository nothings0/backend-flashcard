const router = require("express").Router();
const NotificationController = require("../controller/NotificationController");
const { verifyAdmin, verifyToken } = require("../middleware");

router
  .route("/")
  .get(verifyToken, NotificationController.GetNotifi)
  .post(verifyAdmin, NotificationController.CreateNotifi)
  .patch(verifyToken, NotificationController.ReadNotifi)
  .delete(verifyToken, NotificationController.DeleteNotifi);

router
  .route("/multiple")
  .post(verifyAdmin, NotificationController.CreateMultiple);

module.exports = router;
