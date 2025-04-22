const Room = require("../../model/Room");
const QRCode = require("qrcode");
const ProLearnController = require("../Card/ProLearnController");
// const client = require("../../helper/connectRedis");

const TIME = 20;
const TIMEOUT = 3 * 1000;
const TIMEINTERVAL = TIMEOUT + TIME * 1000;
const COUNT_QUES = 10;
const URL = "https://fluxquiz.vercel.app/live";
module.exports = (socket, io) => {
  const creatRoom = async (userId) => {
    try {
      const roomId = generateRoomId();
      const room = new Room({
        members: [
          {
            id: socket.id,
            mark: 0,
            name: "YOU",
          },
        ],
        user: userId,
        roomId,
      });
      await room.save();
      socket.join(roomId);
      const urlWeb = `${URL}/${roomId}`;
      const qrcode = await QRCode.toString(urlWeb, { type: "svg" });
      socket.emit("room-created", { roomId, qrcode });
    } catch (error) {
      console.log(error);
    }
  };
  const joinRoom = async ({ roomId, username }) => {
    try {
      const room = await Room.findOne({ roomId: roomId.toUpperCase() });
      if (room) {
        room.members.push({
          id: socket.id,
          mark: 0,
          name: username,
        });
        await room.save();
        socket.join(roomId);
        let status = "success";
        if (room.status === "running") status = "navigate";
        io.to(socket.id).emit("joined-room", status);

        io.to(roomId).emit("members", room.members);
      } else {
        io.to(socket.id).emit("error", "Không tồn tại phòng này!!!");
      }
    } catch (error) {
      console.log(error);
    }
  };
  const getMembers = async (roomId) => {
    try {
      const room = await Room.findOne({ roomId: roomId.toUpperCase() });
      io.to(roomId).emit("members", room.members);
    } catch (error) {}
  };

  function GetQuestions({ slug, roomId }) {
    let currentQuestionStartTime = Date.now();
    setTimeout(async () => {
      currentQuestionStartTime = Date.now();
      const ques = await ProLearnController.getQuiz(slug);
      const quizStore = {
        ques,
        startTime: currentQuestionStartTime,
      };

      io.to(roomId).emit("quiz", quizStore);
    }, TIMEOUT);
  }

  socket.on("next", ({ roomId }) => {
    const room = rooms[roomId];
    room.currentQuestion += 1;
    if (room.currentQuestion < room.questions.length) {
      io.to(roomId).emit("next-question", {
        question: room.questions[room.currentQuestion],
        index: room.currentQuestion
      });
    } else {
      io.to(roomId).emit("game-over", room.scores);
    }
  });

  const markQuiz = async ({ answer, id, roomId }) => {
    try {
      const result = await ProLearnController.getMark(answer, id);
      if (result.check) {
        await Room.updateOne(
          { roomId: roomId, "members.id": socket.id },
          { $inc: { "members.$.mark": 10 } }
        );
      }
    } catch (error) {
      console.log(error);
    }
  };
  const startQuiz = async (roomId) => {
    io.to(roomId).emit("started", roomId);
    await Room.findOneAndUpdate(
      { roomId: roomId.toUpperCase() },
      {
        $set: { status: "running" },
      }
    );
  };

  socket.on("create-room", creatRoom);
  socket.on("join-room", joinRoom);
  socket.on("get-members", getMembers);
  socket.on("new-room", creatRoom);
  socket.on("get-quiz", getQuiz);
  socket.on("start", startQuiz);
  socket.on("get-mark-quiz", markQuiz);
};

function generateRoomId(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result.toUpperCase();
}
