// controllers/AIController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const User = require('../model/User');

const AIController = {
  getAIStream: async (req, res) => {

    const userId = req.user._id

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ msg: "Người dùng không tồn tại" });
    }

    if (!["MONTHLY", "YEARLY"].includes(user.plan.type)) {
      return res.status(403).json({ msg: "Người dùng không có quyền truy cập" });
    }

    const { userMessage } = req.body;

    // Đặt headers cho stream
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const chatSession = model.startChat({
        history: [
          {
            role: "user",
            parts: [{
              text: "Bạn là một trợ lý học tập dễ thương, thân thiện, luôn trả lời bằng giọng điệu cute, vui vẻ và gần gũi như một người bạn nhỏ. Bạn chỉ hỗ trợ các câu hỏi liên quan đến học tập. Nếu câu hỏi không liên quan, hãy lịch sự từ chối và yêu cầu người dùng hỏi lại theo đúng chủ đề học tập."
            }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
        },
      });

      const result = await chatSession.sendMessageStream(userMessage);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        res.write(text); // gửi về client từng dòng
      }

      res.end(); // kết thúc stream
    } catch (error) {
      console.error("Gemini stream error:", error);
      res.write("[ERROR] Đã xảy ra lỗi từ trợ lý AI.");
      res.end();
    }
  },

  // voiceAI: async (req, res, next) => {
  //   const audioPath = path.resolve(req.file.path);

  //   try {
  //     const result = await transcribe(audioPath, {
  //       model: 'base.en', // hoặc base, small, medium
  //       language: 'en',   // hoặc 'vi' nếu là tiếng Việt
  //     });

  //     res.json({ text: result.text });
  //   } catch (error) {
  //     next(error)
  //   }
  // }
};

module.exports = AIController;
