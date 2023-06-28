const Section = require("../../model/Board/Section");
const Board = require("../../model/Board/Board");
const Task = require("../../model/Board/Task");
const { sortOrder } = require("../../util");

const BoardController = {
  create: async (req, res, next) => {
    const userId = req.user._id;
    const { data } = req.body;
    try {
      const boardUser = await Board.find({ user: userId });
      if (boardUser.length > 0)
        return res
          .status(409)
          .json({ msg: "board already exists", status: 409 });
      await BoardController.createBoard(data, userId);
      res.status(201).json({ msg: "create board success!!!", status: 200 });
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
          status: 400,
        });
      let sections = await Section.find({ board: board._id });
      for (const section of sections) {
        let tasks = await Task.find({ section: section._id });
        tasks = sortOrder(tasks, section.taskOrder, "_id");
        section._doc.tasks = tasks;
      }
      sections = sortOrder(sections, board.cardOrder, "_id");
      res.status(200).json({ board, sections, status: 200 });
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
  createBoard: async (data, userId) => {
    const sections = data.sections;

    const board = new Board({
      user: userId,
      title: data.board.title,
    });
    await board.save();
    for (const item of sections) {
      const tasks = item.tasks;
      const section = new Section({
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
        const task = new Task({
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
  },
};

module.exports = BoardController;
