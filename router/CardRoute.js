const CardController = require("../controller/CardController");
const LearnController = require("../controller/Card/LearnController");
const TestController = require("../controller/Card/TestController");
const WriteController = require("../controller/Card/WriteController");
const FlashCardController = require("../controller/Card/FlashCardController");
const ListenController = require("../controller/Card/ListenController");
const { verifyToken, verifyAdmin } = require("../middleware/index");
const MatchCardController = require("../controller/Card/MatchCard");
const ProLearnController = require("../controller/Card/ProLearnController");
const router = require("express").Router();

router.route("/library").get(verifyToken, CardController.getCardInUser);
router
  .route("/user")
  .get(verifyToken, CardController.getCardsOfUser)
  .post(verifyToken, CardController.AddCardExtension);

router
  .route("/")
  .get(CardController.getAllCard)
  .post(verifyToken, CardController.createCard);
router
  .route("/extension")
  .post(verifyToken, CardController.createCardExtension);

router
  .route("/admin/all")
  .get(verifyAdmin, CardController.getAllCards)
  .post(verifyAdmin, CardController.createCardAdmin);

router
  .route("/admin")
  .patch(verifyAdmin, CardController.updateCardAdmin)
  
router.route("/term").delete(CardController.deleteTerms);
router.route("/delet-term/:termId").delete(CardController.deleteTerm);
router.route("/updateSlug/:slug").put(CardController.CreateSlug);
router
  .route("/approval/:slug")
  .post(verifyToken, CardController.approvalPlus);
router.route("/upgrade/:slug").put(verifyAdmin, CardController.upgradePlus);
router
  .route("/getPendingPlus")
  .get(verifyAdmin, CardController.getPendingPlus);
router
  .route("/:slug")
  .get(CardController.getCardById)
  .delete(verifyToken, CardController.deleteCard)
  .patch(verifyToken, CardController.updateCard)
  .post(verifyToken, CardController.savedCard);

router.route("/view/:slug").put(CardController.addView);

router.route("/search/:q").get(CardController.search);

router.route("/rate/:slug").post(verifyToken, CardController.rateCard);

// router flash card
router.route("/flashcard/:slug").get(FlashCardController.getFlashCard);
// router learn
router
  .route("/learn/:slug")
  .get(LearnController.getLearn)
  .post(LearnController.getMarkLearn);
// router test
router
  .route("/test/repettion")
  .get(verifyToken, TestController.getSpaceRepTest);
router.route("/test/pro/:slug").get(verifyToken, ProLearnController.getPro);
router
  .route("/test/:slug")
  .get(TestController.getTest)
  .post(TestController.getMarkTest);
// router write
router.route("/write/suggest").get(WriteController.suggest);
router
  .route("/write/:slug")
  .get(WriteController.getWrite)
  .post(WriteController.getMarkWrite);
// router listen
router
  .route("/listen/:slug")
  .get(ListenController.getListen)
  .post(ListenController.getMarkListen);
// router match
router
  .route("/match/:slug")
  .get(MatchCardController.getMatchCard)
  .put(MatchCardController.updateMatchCard)
  .post(MatchCardController.updateAndGet);

router.route("/ted/translation").get(CardController.getTedTranslation);
router.route("/ted/list").get(CardController.getListTed);
router.route("/ted/video").get(CardController.getVideoTed);

module.exports = router;
