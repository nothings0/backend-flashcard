const Section = require("../../model/Board/Section");
const Board = require("../../model/Board/Board");
const Task = require("../../model/Board/Task");

const BoardController = {
  create: async (req, res) => {
    const userId = req.user._id;
    const { data } = req.body;
    const sections = data.sections;
    try {
      const board = await Board.create({
        user: userId,
        title: data.title,
      });
      await board.save();
      for (const item of sections) {
        const tasks = item.tasks;
        const section = await Section.create({
          board: board._id,
          title: item.title,
        });
        await section.save();
        await Board.findByIdAndUpdate(
          board._id,
          {
            $push: {
              cardOrder: section._id,
            },
          },
          { new: true }
        );
        for (const item2 of tasks) {
          const task = await Task.create({
            section: section._id,
            content: item2.content,
            time: item2.time,
          });
          await task.save();
          await Section.findByIdAndUpdate(section._id, {
            $push: {
              taskOrder: task._id,
            },
          });
        }
      }
      res.status(201).json({ msg: "create board success!!!" });
    } catch (err) {
      next(err);
    }
  },
  get: async (req, res, next) => {
    const userId = req.user._id;
    try {
      const board = await Board.findOne({ user: userId });
      if (!board)
        return res.status(400).json({
          msg: "board not found!",
          err: 400,
        });
      const sections = await Section.find({ board: board._id });
      for (const section of sections) {
        const tasks = await Task.find({ section: section._id });
        section._doc.tasks = tasks;
      }
      res.status(200).json({ board, sections });
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    const { boardId } = req.params;
    const { title } = req.body;
    try {
      await Board.findByIdAndUpdate(boardId, {
        $set: {
          title: title,
        },
      });
      res.status(200).json({ msg: "Update success" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = BoardController;
