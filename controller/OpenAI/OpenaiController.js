const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const OpenaiController = {
  addvice: async (req, res) => {
    const { prompt } = req.body;

    try {
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `không nói gì thêm, liệt kê ra 3 ví dụ dùng từ ${prompt} trong tiếng anh kèm theo nghĩa tiếng việt bên dưới`,
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      res.status(200).json({
        bot: response.data.choices[0].text,
      });
    } catch (error) {
      res.status(500).json({ error });
    }
  },
};

module.exports = OpenaiController;
