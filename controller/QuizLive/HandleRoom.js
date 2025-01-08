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
            name: "USER_01",
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
      const room = await Room.findOne({ roomId: roomId });
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
        io.to(socket.id).emit("error", "Invalid room ID");
      }
    } catch (error) {
      console.log(error);
    }
  };
  const reJoinRoom = async (roomId) => {
    try {
      const room = await Room.findOne({ roomId: roomId });
      if (room) {
        socket.join(roomId);
        let status = "success";
        if (room.status === "running") {
          status = "navigate";
        }
        io.to(socket.id).emit("joined-room", status);
      } else {
        io.to(socket.id).emit("error", "Invalid room ID");
      }
    } catch (error) {
      console.log(error);
    }
  };
  const getMembers = async (roomId) => {
    try {
      const room = await Room.findOne({ roomId: roomId });
      io.to(roomId).emit("members", room.members);
    } catch (error) {}
  };

  function sendQuestionForRoom({ slug, roomId }) {
    let currentQuestionStartTime = Date.now();
    setTimeout(async () => {
      currentQuestionStartTime = Date.now();
      const ques = await ProLearnController.getQuiz(slug);
      const quizStore = {
        ques,
        startTime: currentQuestionStartTime,
      };
      // client.set(
      //   roomId,
      //   JSON.stringify(quizStore),
      //   "EX",
      //   TIME,
      //   (err, reply) => {}
      // );

      io.to(roomId).emit("quiz", quizStore);
    }, TIMEOUT);
  }

  const ReGetQuiz = (roomId) => {
    // client.get(roomId, (err, quiz) => {
    //   if (err) return;
    //   ques = JSON.parse(quiz);
    //   io.to(roomId).emit("quiz", ques);
    // });
  };

  const getQuiz = async ({ slug, roomId, index }) => {
    sendQuestionForRoom({ slug, roomId });
    let idx = index;
    let interval = setInterval(async () => {
      if (idx > COUNT_QUES) {
        const res = await Room.aggregate([
          {
            $match: { roomId },
          },
          {
            $unwind: "$members",
          },
          {
            $group: {
              _id: "$members.id",
              totalMark: { $sum: "$members.mark" },
              name: { $first: "$members.name" },
            },
          },
          {
            $sort: { totalMark: -1 }, // Sắp xếp từ cao xuống thấp
          },
        ]);

        io.to(roomId).emit("end-quiz", res);

        clearInterval(interval);
        return;
      }
      sendQuestionForRoom({ slug, roomId });
      idx = idx + 1;
    }, TIMEINTERVAL);
  };
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
      { roomId: roomId },
      {
        $set: { status: "running" },
      }
    );
  };

  socket.on("create-room", creatRoom);
  socket.on("join-room", joinRoom);
  socket.on("get-members", getMembers);
  socket.on("rejoin-room", reJoinRoom);
  socket.on("new-room", creatRoom);
  socket.on("get-quiz", getQuiz);
  socket.on("start", startQuiz);
  socket.on("get-mark-quiz", markQuiz);
  socket.on("re-get-quiz", ReGetQuiz);
};

function generateRoomId(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
