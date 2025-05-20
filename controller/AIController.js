const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const User = require('../model/User');
const Card = require('../model/Card');
const Term = require('../model/Term');
const slugify = require('slugify');

const AIController = {
  getAIStream: async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "Người dùng không tồn tại nè! 😿" });
    }

    if (!["MONTHLY", "YEARLY"].includes(user.plan.type)) {
      return res.status(403).json({ msg: "Hihi, bạn cần nâng cấp gói MONTHLY hoặc YEARLY để dùng tính năng này nha! 😸" });
    }

    const { userMessage } = req.body;

    if (!userMessage) {
      return res.status(400).json({ msg: "Hihi, bạn cần gửi tin nhắn nha! 😺" });
    }

    // Thiết lập header cho streaming
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
          responseMimeType: 'application/json', // Ràng buộc trả về JSON
        },
      });

      // Prompt để phân tích ý định
      const intentPrompt = `
        Hihi! Tớ là trợ lý học tập siêu cute đây! 😺 
        Tớ cần bạn giúp tớ hiểu ý định của tin nhắn này: "${userMessage}".
        Hãy phân tích và trả về đúng định dạng JSON (chỉ JSON, không thêm văn bản ngoài):
        {
          "intent": "create_flashcard | answer_question",
          "languagePair": "Ngôn ngữ gốc -> Ngôn ngữ đích (nếu intent là create_flashcard, ví dụ: English to Vietnamese)",
          "topic": "Chủ đề (nếu intent là create_flashcard, ví dụ: Animals)"
        }
        - Nếu tin nhắn yêu cầu tạo flashcard (ví dụ: "Tạo bộ flashcard về động vật"), đặt intent là "create_flashcard" và trích xuất languagePair, topic.
        - Nếu không rõ ngôn ngữ, mặc định là "English to Vietnamese".
        - Nếu không rõ chủ đề, đặt intent là "answer_question".
        - Nếu là câu hỏi học tập thông thường, đặt intent là "answer_question" và để languagePair, topic là null.
        - Quan trọng: Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác!
      `;

      // Thử phân tích ý định, retry tối đa 2 lần nếu JSON không hợp lệ
      let intentData;
      let retries = 0;
      const maxRetries = 2;

      while (retries < maxRetries) {
        try {
          const intentResult = await chatSession.sendMessage(intentPrompt);
          intentData = JSON.parse(intentResult.response.text());
          break; // Thoát nếu parse thành công
        } catch (parseError) {
          retries++;
          if (retries === maxRetries) {
            res.write("Hihi, tớ gặp khó khăn khi hiểu ý bạn rồi! 😿 Hãy thử nói rõ hơn nha, ví dụ: 'Tạo bộ flashcard tiếng Anh về động vật'!");
            res.end();
            return;
          }
          // Delay trước khi retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (intentData.intent === 'create_flashcard' && intentData.languagePair && intentData.topic) {
        // Tạo flashcard
        const cardPrompt = `
          Hihi! Bạn là một trợ lý học tập siêu dễ thương đây! 😺 Hãy tạo một bộ flashcard cho việc học ngôn ngữ nha!
          - Ngôn ngữ: ${intentData.languagePair}.
          - Chủ đề: ${intentData.topic}.
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

        // Thử tạo flashcard, retry nếu JSON không hợp lệ
        let cardContent;
        retries = 0;
        while (retries < maxRetries) {
          try {
            const cardResult = await chatSession.sendMessage(cardPrompt);
            cardContent = JSON.parse(cardResult.response.text());
            break;
          } catch (parseError) {
            retries++;
            if (retries === maxRetries) {
              res.write("Hihi, tớ gặp khó khăn khi tạo flashcard rồi! 😿 Hãy thử lại nha!");
              res.end();
              return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Tạo Card
        const card = new Card({
          title: cardContent.title,
          description: cardContent.description,
          slug: slugify(cardContent.title, { lower: true, strict: true }),
          user: userId,
          share: true,
          views: 5,
          background: '',
          type: 'REGULAR',
          rate: { total: 0, quantity: 0 },
        });

        const savedCard = await card.save();

        // Tạo Terms
        const terms = cardContent.terms.map((term, index) => ({
          prompt: term.prompt,
          answer: term.answer,
          cardId: savedCard._id,
          position: index + 1,
        }));

        await Term.insertMany(terms);

        // Gửi thông báo flashcard dạng stream
        const cardLink = `https://fluxquiz.vercel.app/card/${savedCard.slug}`;
        const message = `Hihi! Tớ vừa tạo xong bộ flashcard siêu xịn về ${intentData.topic} nè: ${cardLink} 😸 Nhấn vào để xem ngay nha!`;

        for (let i = 0; i < message.length; i += 10) {
          const chunk = message.slice(i, i + 10);
          res.write(chunk);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else {
        // Trả lời câu hỏi thông thường
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
};

module.exports = AIController;