const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
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
     origin: ["https://fluxquiz.netlify.app", "https://fluxquiz.vercel.app"],
 },
});
app.use(
  cors({
    origin: [
      "https://fluxquiz.netlify.app",
      "chrome-extension://ofnhhicnibhaanoobogcblgahdiaeodp",
      "https://fluxquiz.vercel.app",
    ],
    credentials: true,
  })
);
// app.use(cors({ origin: "http://localhost:3000", credentials: true }));
// init route
const UserRoute = require("./router/UserRoute");
const CardRoute = require("./router/CardRoute");
const OpenaiRoute = require("./router/OpenaiRoute");

const BoardRoute = require("./router/Board/BoardRoute");
const SectionRoute = require("./router/Board/SectionRoute");
const TaskRoute = require("./router/Board/TaskRoute");

const NotifiRoute = require("./router/NotifiRoute");
const ActiveRoute = require("./router/ActiveRoute");

// secure api
const apiSecure = require("./middleware/apiSecure");

// quiz live func
const handleRoom = require("./controller/QuizLive/HandleRoom");

app.use(cookies());
app.use(express.json({}));
app.use(morgan("common"));
// app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  fileUpload({
    useTempFiles: true,
  })
);

app.use("/v1/auth", UserRoute);
app.use("/v1/card", CardRoute);
app.use("/v1/notification", NotifiRoute);
app.use("/v1/active", ActiveRoute);

app.use("/v1/board", apiSecure, BoardRoute);
app.use("/v1/section", apiSecure, SectionRoute);
app.use("/v1/task", apiSecure, TaskRoute);

app.use("/v1/openai", OpenaiRoute);

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

const connect = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to mongoDB.");
  } catch (error) {
    throw error;
  }
};

server.listen(process.env.PORT || 8000, () => {
  connect();
  console.log("server is running....");
});

const onConnection = (socket) => {
  handleRoom(socket, io);
};

io.on("connection", onConnection);

cron.schedule("*/12 * * * *", async () => {
  try {
    const response = await axios("https://backend-kfnn.onrender.com");
    const data = await response.data;
    console.log(data);
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
  }
});
