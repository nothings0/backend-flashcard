const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const User = require("../model/User");
const Card = require("../model/Card");
const Term = require("../model/Term");
const slugify = require("slugify");

const LANGUAGE = {
  "en-US": "English",
  "ja-JP": "Japanese",
  "ko-KR": "Korean",
  "cmn-Hant-TW": "Chinese",
};

const AIController = {
  getAIStream: async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "Người dùng không tồn tại nè! 😿" });
    }

    if (!["MONTHLY", "YEARLY"].includes(user.plan.type)) {
      return res.status(403).json({
        msg: "Hihi, bạn cần nâng cấp gói MONTHLY hoặc YEARLY để dùng tính năng này nha! 😸",
      });
    }

    const { userMessage, context = [] } = req.body;

    if (!userMessage) {
      return res
        .status(400)
        .json({ msg: "Hihi, bạn cần gửi tin nhắn nha! 😺" });
    }

    // Kiểm tra context
    if (
      !Array.isArray(context) ||
      context.some((msg) => !msg.sender || !msg.message)
    ) {
      return res
        .status(400)
        .json({ msg: "Hihi, context không đúng định dạng nè! 😿" });
    }

    // Thiết lập header cho streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Lấy flashcard mới nhất để dự phòng
      const latestCard = await Card.findOne({ user: userId }).sort({
        createdAt: -1,
      });

      // Tạo history từ context (giới hạn 10 tin nhắn: 5 user + 5 AI)
      const history = [
        {
          role: "user",
          parts: [
            {
              text: "Bạn là một trợ lý học tập dễ thương, thân thiện, luôn trả lời bằng giọng điệu cute, vui vẻ và gần gũi như một người bạn nhỏ. Bạn chỉ hỗ trợ các câu hỏi liên quan đến học tập. Nếu câu hỏi không liên quan, hãy lịch sự từ chối và yêu cầu người dùng hỏi lại theo đúng chủ đề học tập.",
            },
          ],
        },
        ...context.slice(-6).map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.message }],
        })),
      ];

      // Nhận diện câu hỏi dịch thuật
      const isTranslationQuestion = userMessage.match(
        /dịch.*(sang|tới|qua)\s*(tiếng\s*\w+)/i
      );

      if (isTranslationQuestion) {
        // Xử lý câu hỏi dịch thuật
        const translationPrompt = `
          Hihi! Bạn là một trợ lý học tập siêu cute đây! 😺 
          Hãy dịch câu hoặc từ này: "${userMessage}" thành ngôn ngữ yêu cầu.
          - Trả về chỉ nội dung dịch (không thêm JSON hay văn bản khác, ví dụ: "国家").
          - Nếu không rõ từ hoặc ngữ cảnh, trả về "Hihi, tớ không hiểu từ này nè! 😿 Hãy thử lại nha!"
        `;

        const chatSession = model.startChat({
          history,
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "text/plain",
          },
        });

        const result = await chatSession.sendMessageStream(translationPrompt);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          res.write(text);
        }
        res.end();
        return;
      }

      // Phân tích ý định cho các câu hỏi khác
      const intentChatSession = model.startChat({
        history,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      });

      const intentPrompt = `
        Hihi! Tớ là trợ lý học tập siêu cute đây! 😺 
        Tớ cần bạn giúp tớ hiểu ý định của tin nhắn này: "${userMessage}".
        Hãy phân tích dựa trên lịch sử trò chuyện và trả về đúng định dạng JSON (chỉ JSON, không thêm văn bản ngoài):
        {
          "intent": "create_flashcard | answer_question | update_flashcard",
          "languagePair": "Ngôn ngữ gốc -> Ngôn ngữ đích (nếu intent là create_flashcard hoặc update_flashcard, ví dụ: English to Vietnamese)",
          "topic": "Chủ đề (nếu intent là create_flashcard hoặc update_flashcard, ví dụ: Animals, đoán từ lịch sử nếu không rõ)",
          "slug": "Slug của flashcard (nếu update_flashcard, trích xuất từ link trong lịch sử, ví dụ: world-english-to-vietnamese-1gy, mặc định null)",
          "quantity": "Số lượng từ cần thêm (nếu update_flashcard, ví dụ: 5, mặc định null)",
          "isPrivate": true | false (nếu update_flashcard, mặc định null),
          "password": "Mật khẩu (nếu isPrivate là true, mặc định null)",
          "newTitle": "Tiêu đề mới (nếu update_flashcard, mặc định null)",
          "newDescription": "Mô tả mới (nếu update_flashcard, mặc định null)",
          "newBackground": "URL ảnh nền mới (nếu update_flashcard, mặc định null)"
        }
        - Nếu tin nhắn yêu cầu tạo flashcard (ví dụ: "Tạo bộ flashcard về Animals"), đặt intent là "create_flashcard".
        - Nếu yêu cầu cập nhật flashcard (ví dụ: "Thêm 5 từ vào flashcard", "Cập nhật flashcard vừa tạo"), đặt intent là "update_flashcard".
        - Nếu user nhắc "flashcard vừa tạo" hoặc không rõ chủ đề, tìm trong lịch sử tin nhắn AI gần nhất có link flashcard (như "https://fluxquiz.vercel.app/card/world-english-to-vietnamese-1gy") và trích xuất slug (phần sau /card/) làm "slug". Nếu không tìm thấy, dùng chủ đề từ tin nhắn user gần nhất (như "tạo bộ card chủ đề về thế giới" → topic: "World").
        - Nếu không rõ ngôn ngữ, mặc định là "English to Vietnamese".
        - Nếu không rõ chủ đề hoặc slug, để topic và slug là null, nhưng vẫn đặt intent là "update_flashcard" nếu có từ khóa như "cập nhật", "thêm thẻ".
        - Nếu là câu hỏi học tập thông thường, đặt intent là "answer_question" và để các trường còn lại là null.
        - Quan trọng: Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác!
      `;

      // Thử phân tích ý định
      let intentData;
      let retries = 0;
      const maxRetries = 2;

      while (retries < maxRetries) {
        try {
          const intentResult = await intentChatSession.sendMessage(
            intentPrompt
          );
          intentData = JSON.parse(intentResult.response.text());
          break;
        } catch (parseError) {
          retries++;
          if (retries === maxRetries) {
            res.write(
              'Hihi, tớ không hiểu rõ ý bạn muốn nè! 😿 Hãy thử nói rõ hơn nha, ví dụ: "Tạo bộ flashcard tiếng Anh về động vật" hoặc "Thêm 5 từ vào flashcard Family"!'
            );
            res.end();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (
        intentData.intent === "create_flashcard" &&
        intentData.languagePair &&
        intentData.topic
      ) {
        // Tạo flashcard mới
        const cardPrompt = `
          Hihi! Bạn là một trợ lý học tập siêu dễ thương đây! 😺 Hãy tạo một bộ flashcard cho việc học ngôn ngữ nha!
          - Ngôn ngữ: ${intentData.languagePair}.
          - Chủ đề: ${intentData.topic}.
          - Số lượng từ: ${intentData.quantity || 15}.
          - Trả về đúng định dạng JSON (chỉ JSON, không thêm văn bản ngoài):
          {
            "title": "Tiêu đề bộ flashcard",
            "description": "Mô tả bộ flashcard, vui vẻ và dễ hiểu nha",
            "terms": [
              { "prompt": "từ trong ngôn ngữ gốc", "answer": "dịch sang ngôn ngữ đích" },
              ...
            ]
          }
          - Quan trọng: Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác!
        `;

        let cardContent;
        retries = 0;
        while (retries < maxRetries) {
          try {
            const cardResult = await intentChatSession.sendMessage(cardPrompt);
            cardContent = JSON.parse(cardResult.response.text());
            break;
          } catch (parseError) {
            retries++;
            if (retries === maxRetries) {
              res.write(
                "Hihi, tớ gặp khó khăn khi tạo flashcard rồi! 😿 Hãy thử lại nha!"
              );
              res.end();
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        const lastThreeChars = Math.random().toString(36).slice(-3);

        const card = new Card({
          title: cardContent.title,
          description: cardContent.description,
          slug: slugify(cardContent.title + "-" + lastThreeChars, {
            lower: true,
            strict: true,
          }),
          user: userId,
          share: true,
          views: 5,
          background:
            "linear-gradient(135deg, rgba(154,4,129,1) 0%, rgba(220,61,99,1) 50%, rgba(254,115,23,1) 100%)",
          type: "REGULAR",
          rate: { total: 0, quantity: 0 },
        });

        const savedCard = await card.save();

        const terms = cardContent.terms.map((term, index) => ({
          prompt: term.prompt,
          answer: term.answer,
          cardId: savedCard._id,
          position: index + 1,
        }));

        await Term.insertMany(terms);

        const cardLink = `https://fluxquiz.vercel.app/card/${savedCard.slug}`;
        const message = `Hihi! Tớ vừa tạo xong bộ flashcard siêu xịn về ${intentData.topic} nè: ${cardLink} 😸 Nhấn vào để xem ngay nha!`;

        for (let i = 0; i < message.length; i += 10) {
          const chunk = message.slice(i, i + 10);
          res.write(chunk);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } else if (intentData.intent === "update_flashcard") {
        // Cập nhật flashcard
        let card;
        if (intentData.slug) {
          card = await Card.findOne({ slug: intentData.slug, user: userId });
        } else if (intentData.topic) {
          card = await Card.findOne({
            slug: slugify(intentData.topic, { lower: true, strict: true }),
            user: userId,
          });
        } else if (latestCard) {
          card = latestCard;
        }

        if (!card) {
          res.write(
            `Hihi, tớ không tìm thấy flashcard nào để cập nhật nè! 😿 Nói rõ chủ đề như 'Cập nhật flashcard World' hoặc tạo flashcard trước nha!`
          );
          res.end();
          return;
        }

        // Tạo prompt để sinh nội dung mới nếu cần thêm từ
        let newTerms = [];
        if (intentData.quantity) {
          const updatePrompt = `
            Hihi! Bạn là một trợ lý học tập siêu dễ thương đây! 😺 
            Hãy tạo thêm ${
              intentData.quantity
            } từ vựng mới cho bộ flashcard hiện có.
            - Ngôn ngữ: ${intentData.languagePair || "English to Vietnamese"}.
            - Chủ đề: ${intentData.topic || card.title}.
            - Trả về đúng định dạng JSON (chỉ JSON, không thêm văn bản ngoài):
            {
              "terms": [
                { "prompt": "từ trong ngôn ngữ gốc", "answer": "dịch sang ngôn ngữ đích" },
                ...
              ]
            }
            - Quan trọng: Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác!
          `;

          let updateContent;
          retries = 0;
          while (retries < maxRetries) {
            try {
              const updateResult = await intentChatSession.sendMessage(
                updatePrompt
              );
              updateContent = JSON.parse(updateResult.response.text());
              break;
            } catch (parseError) {
              retries++;
              if (retries === maxRetries) {
                res.write(
                  "Hihi, tớ gặp khó khăn khi thêm từ mới rồi! 😿 Hãy thử lại nha!"
                );
                res.end();
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }

          const lastPosition = await Term.find({ cardId: card._id })
            .sort({ position: -1 })
            .limit(1);
          const startPosition =
            lastPosition.length > 0 ? lastPosition[0].position + 1 : 1;

          newTerms = updateContent.terms.map((term, index) => ({
            prompt: term.prompt,
            answer: term.answer,
            cardId: card._id,
            position: startPosition + index,
          }));

          await Term.insertMany(newTerms);
        }

        // Cập nhật các trường khác của Card
        const updateFields = {};
        if (intentData.newTitle) updateFields.title = intentData.newTitle;
        if (intentData.newDescription)
          updateFields.description = intentData.newDescription;
        if (intentData.newBackground)
          updateFields.background = intentData.newBackground;
        if (intentData.isPrivate !== null)
          updateFields.share = !intentData.isPrivate;
        if (intentData.password) updateFields.password = intentData.password;
        if (intentData.newTitle)
          updateFields.slug = slugify(intentData.newTitle, {
            lower: true,
            strict: true,
          });

        if (Object.keys(updateFields).length > 0) {
          await Card.updateOne({ _id: card._id }, { $set: updateFields });
        }

        const cardLink = `https://fluxquiz.vercel.app/card/${
          updateFields.slug || card.slug
        }`;
        const message = `Hihi! Tớ vừa cập nhật xong bộ flashcard siêu xịn về ${
          intentData.topic || card.title
        } nè: ${cardLink} 😸 Nhấn vào để xem ngay nha!`;

        for (let i = 0; i < message.length; i += 10) {
          const chunk = message.slice(i, i + 10);
          res.write(chunk);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } else {
        // Trả lời câu hỏi thông thường
        const chatSession = model.startChat({
          history,
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "text/plain",
          },
        });

        const result = await chatSession.sendMessageStream(userMessage);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          res.write(text);
        }
      }

      res.end();
    } catch (error) {
      console.error("Gemini stream error:", error);
      res.write("Ooops! Trợ lý AI bị lỗi xíu rồi, thử lại nha! 😿");
      res.end();
    }
  },

  generateTerms: async (req, res) => {
    const userId = req.user._id;
    const { title, language, existingPrompts = [] } = req.body;

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "Người dùng không tồn tại nè! 😿" });
    }

    // Check subscription plan
    if (!["MONTHLY", "YEARLY"].includes(user.plan.type)) {
      return res.status(403).json({
        msg: "Hihi, bạn cần nâng cấp gói MONTHLY hoặc YEARLY để dùng tính năng này nha! 😸",
      });
    }

    // Validate title
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res
        .status(400)
        .json({ msg: "Hihi, bạn cần cung cấp tiêu đề hợp lệ nha! 😺" });
    }

    // Set headers for streaming
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Prompt to generate terms
      const prompt = `
        Hihi! Bạn là một trợ lý học tập siêu cute đây! 😺 
        Hãy tạo một danh sách từ vựng cho bộ flashcard dựa trên tiêu đề: "${title}".
        - Ngôn ngữ: ${
          language ? LANGUAGE[language] : "English"
        }  to Vietnamese (mặc định, trừ khi tiêu đề chỉ rõ ngôn ngữ khác).
        - Số lượng: 11 đến 16 từ vựng (prompt và answer).
        ${
          existingPrompts.length
            ? `- Không được trùng với các từ sau: ${existingPrompts.join(", ")}`
            : ""
        }
        - Trả về từng từ vựng dưới dạng JSON riêng lẻ, mỗi JSON trên một dòng, không bao quanh bởi mảng:
        {"prompt":"từ trong ngôn ngữ gốc","answer":"dịch sang ngôn ngữ đích"}
        - Ví dụ:
        {"prompt":"cat","answer":"con mèo"}
        {"prompt":"dog","answer":"con chó"}
        - Quan trọng: Chỉ trả về JSON, mỗi object trên một dòng, không thêm văn bản ngoài!
      `;

      const chatSession = model.startChat({
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "text/plain",
        },
      });

      const result = await chatSession.sendMessage(prompt);
      const text = await result.response.text();
      const lines = text.split("\n").filter((line) => line.trim());

      // Stream each term with a delay
      for (const line of lines) {
        try {
          JSON.parse(line); // Validate JSON
          res.write(line + "\n");
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay between terms
        } catch (e) {
          console.error("Invalid JSON chunk:", line, e);
          continue;
        }
      }

      res.end();
    } catch (error) {
      console.error("Generate terms stream error:", error);
      res.write('{"error":"Ooops! Trợ lý AI bị lỗi xíu rồi, thử lại nha! 😿"}');
      res.end();
    }
  },

  tts: async (req, res, next) => {
    try {
      const audioFile = req.file; // dùng req.file thay vì req.files
      const context = req.body.context ? JSON.parse(req.body.context) : [];
      if (!audioFile) {
        return res
          .status(400)
          .json({ msg: "Hihi, bạn cần gửi file âm thanh nha! 😺" });
      }

      const formData = new FormData();
      formData.append("audio", fs.createReadStream(audioFile.path), {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype,
      });

      const response = await axios.post(
        "http://14.225.210.46:5005/transcribe",
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      const transcription = response.data.text;
      if (!transcription) {
        return res
          .status(500)
          .json({ msg: "Hihi, không thể nhận diện âm thanh nè! 😿" });
      }

      const history = [
        {
          role: "user",
          parts: [
            {
              text: "You're a cheerful and friendly English-speaking assistant helping a student practice conversation. Your name is Flux. Let Respond naturally and casually to the student's latest message. Keep your reply short, supportive, and engaging — like a fun friend who encourages them to keep speaking more in English. Do not use emojis, special characters, or new lines. Only return plain text and maximum 200 characters",
            },
          ],
        },
        ...context.slice(-6).map((msg) => ({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.message }],
        })),
        {
          role: "user",
          parts: [{ text: transcription }],
        },
      ];

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent({
        contents: history,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "text/plain",
        },
      });

      const replyText = result.response.text();

      return res.json({
        user: transcription,
        reply: replyText,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Lỗi khi xử lý âm thanh 😿" });
    } finally {
      // Xoá file tạm sau khi xử lý
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error("Lỗi xoá file tạm:", err);
          }
        });
      }
    }
  },
};

module.exports = AIController;
