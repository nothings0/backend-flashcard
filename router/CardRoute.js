const CardController = require("../controller/CardController");
const LearnController = require("../controller/Card/LearnController");
const TestController = require("../controller/Card/TestController");
const WriteController = require("../controller/Card/WriteController");
const FlashCardController = require("../controller/Card/FlashCardController");
const ListenController = require("../controller/Card/ListenController");
const { verifyToken, verifyAdmin } = require("../middleware/index");
const MatchCardController = require("../controller/Card/MatchCard");
const router = require("express").Router();
const cors = require("cors");

router.route("/library").get(verifyToken, CardController.getCardInUser);
router
  .route("/user")
  .get(verifyToken, cors({ origin: "*" }), CardController.getCardsOfUser)
  .post(verifyToken, cors({ origin: "*" }), CardController.AddCardExtension);

router
  .route("/")
  .get(CardController.getAllCard)
  .post(verifyToken, CardController.createCard);
router
  .route("/extension")
  .post(verifyToken, CardController.createCardExtension);

router
  .route("/adminall")
  .get(verifyAdmin, CardController.getAllCards)
  .post(verifyAdmin, CardController.createCardAdmin);
router.route("/term").delete(CardController.deleteTerm);
router
  .route("/:cardId")
  .get(CardController.getCardById)
  .delete(verifyToken, CardController.deleteCard)
  .patch(verifyToken, CardController.updateCard)
  .post(verifyToken, CardController.savedCard);

router.route("/view/:cardId").put(CardController.addView);

router.route("/search/:q").get(CardController.search);

router.route("/rate/:cardId").post(verifyToken, CardController.rateCard);

// router flash card
router.route("/flashcard/:cardId").get(FlashCardController.getFlashCard);
// router learn
router
  .route("/learn/:cardId")
  .get(LearnController.getLearn)
  .post(LearnController.getMarkLearn);
// router test
router
  .route("/test/repettion")
  .get(verifyToken, TestController.getSpaceRepTest);
router
  .route("/test/:cardId")
  .get(TestController.getTest)
  .post(TestController.getMarkTest);
// router write
router.route("/write/suggest").get(WriteController.suggest);
router
  .route("/write/:cardId")
  .get(WriteController.getWrite)
  .post(WriteController.getMarkWrite);
// router listen
router
  .route("/listen/:cardId")
  .get(ListenController.getListen)
  .post(ListenController.getMarkListen);
// router match
router
  .route("/match/:cardId")
  .get(MatchCardController.getMatchCard)
  .put(MatchCardController.updateMatchCard)
  .post(MatchCardController.updateAndGet);

router.route("/ted/translation").get(CardController.getTedTranslation);
router.route("/ted/list").get(CardController.getListTed);
router.route("/ted/video").get(CardController.getVideoTed);

module.exports = router;
