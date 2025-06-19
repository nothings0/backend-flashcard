const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const cron = require("node-cron");
// const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cookies = require("cookie-parser");
const fileUpload = require("express-fileupload");

dotenv.config();
require("./helper/connectRedis");

// init server
const socketIo = require("socket.io");
const app = express();
const server = require("http").createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "https://fluxquiz.netlify.app",
      "https://fluxquiz.vercel.app",
      "http://localhost:3000",
    ],
  },
});
app.use(
  cors({
    origin: [
      "https://fluxquiz.netlify.app",
      "chrome-extension://ofnhhicnibhaanoobogcblgahdiaeodp",
      "https://fluxquiz.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);
// app.use(cors({ origin: "http://localhost:3000", credentials: true }));
// init route
const UserRoute = require("./router/UserRoute");
const CardRoute = require("./router/CardRoute");

const BoardRoute = require("./router/Board/BoardRoute");
const SectionRoute = require("./router/Board/SectionRoute");
const TaskRoute = require("./router/Board/TaskRoute");

const NotifiRoute = require("./router/NotifiRoute");
const ActiveRoute = require("./router/ActiveRoute");
const PricingRoute = require("./router/PricingRoute");
const InvoiceRoute = require("./router/InvoiceRoute");
const AdminRoute = require("./router/AdminRoute");
const BannerRoute = require("./router/BannerRoute");
const ExerciseRoute = require("./router/ExerciseRoute");
const AffiliateRoute = require("./router/AffiliateRoute");
const AIRoute = require("./router/AIRoute");

// secure api
const apiSecure = require("./middleware/apiSecure");

// quiz live func
const handleRoom = require("./controller/QuizLive/HandleRoom");

app.use(cookies());
app.use(express.json({}));
app.use(morgan("common"));
// app.use(bodyParser.json({ limit: "50mb" }));

app.use(
  "/v1/auth",
  fileUpload({
    useTempFiles: true,
  }),
  UserRoute
);
app.use("/v1/card", CardRoute);
app.use("/v1/notification", NotifiRoute);
app.use("/v1/active", ActiveRoute);

app.use("/v1/board", apiSecure, BoardRoute);
app.use("/v1/section", apiSecure, SectionRoute);
app.use("/v1/task", apiSecure, TaskRoute);

app.use("/v1/pricing", PricingRoute);
app.use("/v1/invoice", InvoiceRoute);
app.use("/v1/affiliate", AffiliateRoute);

app.use("/v1/admin", AdminRoute);
app.use("/v1/banner", BannerRoute);
app.use("/v1/exercise", ExerciseRoute);
app.use("/v1/ai", AIRoute);

app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went wrong!";
  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: err.stack,
  });
});

app.get("/v1/ping", (_, res) => {
  return res.send("pong");
});

const connect = async () => {
  try {
    await mongoose.connect(
      process.env.NODE_ENV === "production"
        ? process.env.DB_URL
        : process.env.DB_URL_LOCAL
    );
    console.log("Connected to mongoDB.");
  } catch (error) {
    throw error;
  }
};

cron.schedule("*/7 * * * *", async () => {
  try {
    await axios("https://backend-kfnn.onrender.com/v1/ping");
    console.log("cron job");
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
  }
});

server.listen(process.env.PORT || 8000, () => {
  connect();
  console.log("server is running....");
});

const onConnection = (socket) => {
  handleRoom(socket, io);
};

io.on("connection", onConnection);
