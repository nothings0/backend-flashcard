const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cookies = require("cookie-parser");
const fileUpload = require("express-fileupload");
dotenv.config();
require("./helper/connectRedis");

const UserRoute = require("./router/UserRoute");
const CardRoute = require("./router/CardRoute");
const OpenaiRoute = require("./router/OpenaiRoute");

const BoardRoute = require("./router/Board/BoardRoute");
const SectionRoute = require("./router/Board/SectionRoute");
const TaskRoute = require("./router/Board/TaskRoute");

const NotifiRoute = require("./router/NotifiRoute");

const apiSecure = require("./middleware/apiSecure");

const app = express();
app.use(cookies());
// app.use(
//   cors({ origin: "https://backend-kfnn.onrender.com", credentials: true })
// );
app.use(cors({ origin: "https://fluxquiz.netlify.app", credentials: true }));
// app.use(cors()); //
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

app.listen(process.env.PORT || 8000, () => {
  connect();
  console.log("server is running....");
});
