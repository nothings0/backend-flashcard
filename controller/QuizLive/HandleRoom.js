const Room = require("../../model/Room");
const QRCode = require("qrcode");
const ProLearnController = require("../Card/ProLearnController");

const URL = "https://fluxquiz.netlify.app/live";
module.exports = (socket, io) => {
  const creatRoom = async (userId) => {
    try {
      const roomId = generateRoomId();
      const room = new Room({
        members: [
          {
            id: userId,
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
        io.to(socket.id).emit("joined-room", { success: true });

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

  const creatQuiz = async ({ user, slug, roomId }) => {
    const ques = await ProLearnController.getQuiz(user, slug);
    io.to(roomId).emit("quiz", ques);
  };
  const markQuiz = async ({ answer, id }) => {
    const result = await ProLearnController.getMark(answer, id);
    // const room = await Room.findOne({ roomId: roomId });
  };

  socket.on("create-room", creatRoom);
  socket.on("join-room", joinRoom);
  socket.on("get-members", getMembers);
  socket.on("rejoin-room", reJoinRoom);
  socket.on("new-room", creatRoom);
  socket.on("create-quiz", creatQuiz);
  socket.on("get-mark-quiz", markQuiz);
};

function generateRoomId(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
