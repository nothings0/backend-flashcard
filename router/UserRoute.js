const UserController = require("../controller/UserController");
const router = require("express").Router();
const { verifyToken, verifyAdmin } = require("../middleware/index");

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/", verifyAdmin, UserController.getAllUser);
router.put("/", verifyToken, UserController.updateAva);
router
  .route("/contact")
  .post(UserController.contactService)
  .get(verifyAdmin, UserController.getContact);
router.get("/:username", verifyToken, UserController.getUser);
router.get("/user/me", verifyToken, UserController.getCurrentUser);
router.put("/user/:userId", verifyToken, UserController.updateUser);
router.post("/refreshToken", UserController.reqRefreshToken);
router.post("/forgotPassword", UserController.forgotPassword);
router.put("/resetPassword", verifyToken, UserController.resetPassword);
router.post("/logout", verifyToken, UserController.logout);
router.post("/active", UserController.activeAccount);

router.post("/google_login", UserController.loginGoogle);
router.post("/facebook_login", UserController.loginFacebook);
router.patch("/achieve", verifyToken, UserController.updateAchieve);
module.exports = router;
