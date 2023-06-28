const User = require("../model/User");
const Card = require("../model/Card");
const Term = require("../model/Term");
const ContactData = require("../model/ContactData");
const Achieve = require("../model/Achieve");
const Notification = require("../model/Notification");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const client = require("../helper/connectRedis");
const sendMail = require("../helper/sendMail");
const jwt_decode = require("jwt-decode");
const fetch = require("node-fetch");
const { OAuth2Client } = require("google-auth-library");

const OAuthClient = new OAuth2Client(`${process.env.CLIENT_ID}`);

// const CLIENT_URL = "http://localhost:3000"
const CLIENT_URL = "https://fluxquiz.netlify.app";
const cloudinary = require("cloudinary");
const BoardController = require("./Board/BoardController");

cloudinary.config({
  cloud_name: "da9mt0m3u",
  api_key: "317733765333113",
  api_secret: "7iijObXifKDXHwdMtmV77-KMKww",
});
const UserController = {
  register: async (req, res, next) => {
    try {
      const { username, password, email } = req.body;

      const userCheck = await User.findOne({ username });
      const emailCheck = await User.findOne({ email });
      if (userCheck)
        return res.status(400).json({ msg: "Tài khoản đã tồn tại" });
      if (emailCheck) return res.status(400).json({ msg: "Email đã tồn tại" });

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      const newUser = {
        username: username,
        password: hashed,
        email: email,
      };
      const active_token = UserController.generateActiveToken({ newUser });
      const url = `${CLIENT_URL}/user/active/${active_token}`;
      sendMail(email, url, "register");
      return res.status(200).json({
        msg: "Vui lòng kiểm tra email để hoàn thành đăng ký tài khoản",
      });
    } catch (err) {
      next(err);
    }
  },
  activeAccount: async (req, res, next) => {
    try {
      const { active_token } = req.body;
      const decoded = jwt.verify(active_token, process.env.SECRET_KEY);
      const { newUser } = decoded;
      if (!newUser)
        return res
          .status(400)
          .json({ msg: "Invalid authentication.", code: 400 });
      registerUser(newUser, res);
    } catch (err) {
      next(err);
    }
  },
  generateActiveToken: (user) => {
    return jwt.sign(user, process.env.SECRET_KEY, { expiresIn: "30m" });
  },
  generateAccessToken: (user) => {
    return jwt.sign(
      { _id: user._id, isAdmin: user.isAdmin },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );
  },
  generateRefreshToken: (user) => {
    return jwt.sign(
      { _id: user._id, isAdmin: user.isAdmin },
      process.env.REFRESH_KEY,
      { expiresIn: "7d" }
    );
  },
  login: async (req, res, next) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res
          .status(400)
          .json({ msg: "Tài khoản không tồn tại", code: 400 });
      }
      loginUser(user, password, res);
    } catch (err) {
      next(err);
    }
  },
  logout: async (req, res, next) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken)
        return res
          .status(401)
          .json({ msg: "You're not authenticated", code: 401 });
      const decodeDToken = jwt_decode(refreshToken);
      let date = new Date();
      if (decodeDToken.exp < date.getTime() / 1000)
        return res.status(401).json({ code: 401, msg: "token expired" });
      jwt.verify(refreshToken, process.env.REFRESH_KEY, (err, user) => {
        if (err) next(err);
        client.del(user._id.toString(), (err, reply) => {
          if (err) return next(err);
          res.status(200).json("Logout success!");
        });
      });
      res.clearCookie("refreshToken");
    } catch (error) {
      next(error);
    }
  },
  reqRefreshToken: async (req, res, next) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken)
        return res
          .status(401)
          .json({ code: 401, msg: "You're not authenticated" });
      const decodeDToken = jwt_decode(refreshToken);
      let date = new Date();
      if (decodeDToken.exp < date.getTime() / 1000)
        return res.status(401).json({ code: 401, msg: "token expired" });
      jwt.verify(refreshToken, process.env.REFRESH_KEY, (err, user) => {
        if (err) next(err);
        const accessToken = UserController.generateAccessToken(user);
        const newRefreshToken = UserController.generateRefreshToken(user);
        res.cookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        client.set(
          user._id.toString(),
          newRefreshToken,
          "EX",
          7 * 24 * 60 * 60,
          (err, reply) => {
            if (err) return next(err);
          }
        );
        return res.status(200).json({ accessToken });
      });
    } catch (error) {
      next(error);
    }
  },
  getAllUser: async (req, res, next) => {
    try {
      const users = await User.find({}, { isAdmin: 0, password: 0 });
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  },
  getUser: async (req, res, next) => {
    const { username } = req.params;
    try {
      const user = await User.findOne(
        { username },
        { isAdmin: 0, password: 0 }
      );
      const cards = await Card.find({ user: user._id }).limit(4);
      let achieve = await Achieve.findOne(
        { user: user._id },
        { user: 0, _id: 0 }
      );
      if (!achieve) {
        const newAchieve = new Achieve({ user: user._id });
        await newAchieve.save();
        achieve = newAchieve;
      }
      const achieveRes = {
        achieveArr: [
          {
            title: "Học",
            data: achieve.achieveLearn,
          },
          {
            title: "Nghe",
            data: achieve.achieveListen,
          },
          {
            title: "Viết",
            data: achieve.achieveWrite,
          },
          {
            title: "Thành thạo",
            data: achieve.achieveTest,
          },
        ],
        targetRes: achieve.target,
      };
      res.status(200).json({ user, cards, achieveRes });
    } catch (error) {
      next(error);
    }
  },
  updateUser: async (req, res, next) => {
    const { userId } = req.params;
    const { data, type } = req.body;
    try {
      if (type === "name") {
        await User.findByIdAndUpdate(userId, { name: data });
      } else if (type === "email") {
        await User.findByIdAndUpdate(userId, { email: data });
      } else if (type === "bio") {
        await User.findByIdAndUpdate(userId, { bio: data });
      } else if (type === "password") {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(data, salt);
        await User.findByIdAndUpdate(userId, { password: hashed });
      } else {
        res.json("Update Faild!");
      }
      res.status(200).json("Update success!");
    } catch (error) {
      next(error);
    }
  },
  deleteUser: async (req, res, next) => {
    const { userId } = req.params;
    try {
      await User.findByIdAndDelete(userId);
      const cards = await Card.find({ user: userId });
      for (const item of cards) {
        await Term.deleteMany({ cardId: item._id });
      }
      await Card.deleteMany({ user: userId });
      res.status(200).json("Delete success!");
    } catch (error) {
      next(error);
    }
  },
  updateAva: async (req, res, next) => {
    const file = req.files.file;
    const userId = req.user._id;
    // const removeTmp = path => {
    //     fs.unlink(path, err => {
    //       if (err) throw err;
    //     })
    // }
    try {
      cloudinary.v2.uploader.upload(
        file.tempFilePath,
        { folder: "ava-user" },
        async (err, result) => {
          if (err) throw err;
          // removeTmp(file.tempFilePath)
          const img = result.secure_url;
          const data = await User.findByIdAndUpdate(
            userId,
            { profilePic: img },
            { new: true }
          );
          res.status(200).json(data);
        }
      );
    } catch (error) {
      next(error);
    }
  },
  forgotPassword: async (req, res, next) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ msg: "Tài khoản không tồn tại!", code: 400 });
      }
      const access_token = UserController.generateAccessToken(user);
      const url = `${CLIENT_URL}/reset-password/${access_token}`;
      sendMail(email, url, "forgotpassword");
      return res.status(200).json({
        msg: "Vui lòng kiểm tra email của bạn để tiến hành lấy lại mật khẩu",
      });
    } catch (error) {
      next(error);
    }
  },
  resetPassword: async (req, res, next) => {
    const { password } = req.body;
    const userId = req.user._id;
    try {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      await User.findByIdAndUpdate(userId, { password: hashed });
      res.status(200).json({ msg: "Đổi mật khẩu thành công" });
    } catch (error) {
      next(error);
    }
  },
  contactService: async (req, res, next) => {
    const { title, email, description } = req.body;
    try {
      const newData = new ContactData({ title, description, email });
      await newData.save();
      res.status(201).json({
        msg: "Gửi thành công, chúng tôi sẽ trả lời nhanh nhất",
        code: 201,
      });
    } catch (err) {
      next(err);
    }
  },
  getContact: async (req, res, next) => {
    try {
      const contacts = await ContactData.find({});
      res.status(201).json({ msg: "Success", success: true, data: contacts });
    } catch (err) {
      next(err);
    }
  },
  replyContact: async (req, res, next) => {
    const { contactId, content } = req.body;
    try {
      const contact = await ContactData.findById(contactId);
      const email = contact.email;
      sendMail(email, content, "contact");
      res.status(201).json({ msg: "Success", success: true });
    } catch (err) {
      next(err);
    }
  },
  loginGoogle: async (req, res, next) => {
    try {
      const { id_token } = req.body;

      const verify = await OAuthClient.verifyIdToken({
        idToken: id_token,
        audience: `${process.env.CLIENT_ID}`,
      });
      const { email, email_verified, name, picture } = verify.getPayload();

      if (!email_verified)
        return res
          .status(401)
          .json({ msg: "Email chưa hoàn tất xác thực Google" });
      const password = email + "your google secrect password";
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await User.findOne({ email });

      if (user) {
        loginUser(user, password, res);
      } else {
        const userObj = {
          username: email,
          email,
          password: passwordHash,
          profilePic: picture,
          name,
        };
        const newUser = new User(userObj);
        await newUser.save();
        const newAchieve = new Achieve({ user: newUser._id });
        await newAchieve.save();
        const notifi = new Notification({
          content: "Chào mừng bạn đến với fluxquiz",
          user: newUser._id,
        });
        await notifi.save();
        loginUser(newUser, password, res);
      }
    } catch (err) {
      next(err);
    }
  },
  loginFacebook: async (req, res, next) => {
    try {
      const { access_token, userID } = req.body;

      const URL = `
              https://graph.facebook.com/v3.0/${userID}/?fields=id,name,email,picture&access_token=${access_token}
            `;

      const data = await fetch(URL)
        .then((res) => res.json())
        .then((res) => {
          return res;
        })
        .catch((err) => next(err));

      const { id, email, name, picture } = data;

      const password = id + "your facebook secrect password";
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await User.findOne({ username: id });

      if (user) {
        loginUser(user, password, res);
      } else {
        const userObj = {
          username: id,
          email: email || `${id}@fluxquiz.com`,
          password: passwordHash,
          profilePic: picture.data.url,
          name,
        };
        const newUser = new User(userObj);
        await newUser.save();
        const newAchieve = new Achieve({ user: newUser._id });
        await newAchieve.save();
        const notifi = new Notification({
          content: "Chào mừng bạn đến với fluxquiz",
          user: newUser._id,
        });
        await notifi.save();
        loginUser(newUser, password, res);
      }
    } catch (error) {
      next(error);
    }
  },
  updateAchieve: async (req, res, next) => {
    try {
      const user = req.user._id;
      const { target } = req.body;
      const achieve = await Achieve.findOne({ user });
      await achieve.updateOne({ $set: { target } });
      res.status(200).json({ success: true, msg: "Update success!" });
    } catch (err) {
      next(err);
    }
  },
};

const loginUser = async (user, password, res) => {
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res
      .status(400)
      .json({ msg: "Tài khoản hoặc mật khẩu không chính xác", code: 400 });
  }
  if (user && validPassword) {
    const accessToken = UserController.generateAccessToken(user);
    const refreshToken = UserController.generateRefreshToken(user);
    client.set(
      user._id.toString(),
      refreshToken,
      "EX",
      7 * 24 * 60 * 60,
      (err, reply) => {
        if (err) next(err);
      }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });
    const userPL = await User.findOne(
      { username: user.username },
      { password: 0 }
    );
    return res.status(200).json({ user: userPL, accessToken });
  }
};
const dataBoard = {
  board: {
    title: "Sắp xếp thời gian học tập!!!",
    user: "admin",
  },
  sections: [
    {
      tasks: [
        {
          content: "Ghi nhớ từ vựng công nghệ thông tin",
          time: "2023-06-22T12:06:59.960Z",
        },
        {
          content: "Luyện nghe tiếng anh trên video youtube ...",
          time: "2023-06-22T12:06:59.960Z",
        },
        {
          content: "Kiểm tra ghi nhớ từ vựng",
          time: "2023-06-22T12:06:59.960Z",
        },
        {
          content: "Ghi nhớ từ vựng công nghệ thông tin ...",
          time: "2023-06-22T12:06:59.960Z",
        },
      ],
      title: "Việc làm",
    },
    {
      tasks: [
        {
          content: "Ghi nhớ từ vựng công nghệ thông tin ...",
          time: "2023-06-22T12:06:59.960Z",
        },
      ],
      title: "Đang làm",
    },
    {
      tasks: [
        {
          content: "Kiểm tra xong",
          time: "2023-06-22T12:06:59.961Z",
        },
        {
          content: "Đã xong",
          time: "2023-06-22T12:06:59.961Z",
        },
        {
          content: "Nhớ 40 / 60 từ",
          time: "2023-06-22T12:06:59.961Z",
        },
      ],
      title: "Hoàn thành",
    },
  ],
};
const registerUser = async (newUser, res) => {
  const user = new User(newUser);
  await user.save();
  const newAchieve = new Achieve({ user: user._id });
  await newAchieve.save();
  const notifi = new Notification({
    content: "Chào mừng bạn đến với fluxquiz",
    user: user._id,
  });
  await notifi.save();
  await BoardController.createBoard(dataBoard, user._id);
  res.status(201).json({ msg: "Đăng ký tài khoản thành công!", code: 201 });
};

module.exports = UserController;
