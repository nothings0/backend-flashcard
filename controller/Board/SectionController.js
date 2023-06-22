const Task = require("../../model/Board/Task");
const Section = require("../../model/Board/Section");
const Board = require("../../model/Board/Board");

const SectionController = {
  create: async (req, res, next) => {
    const { title, boardId } = req.body;
    try {
      const section = await Section.create({
        board: boardId,
        title: title,
      });
      await Board.findByIdAndUpdate(
        boardId,
        {
          $push: {
            cardOrder: section._id,
          },
        },
        { new: true }
      );
      await section.save();
      res.status(201).json({ section });
    } catch (err) {
      next(err);
    }
  },
  get: async (req, res, next) => {
    const { boardId } = req.params;
    try {
      const sections = await Section.find({ board: boardId });
      if (!sections) return res.status(404).json("Board not found");
      for (const section of sections) {
        const tasks = await Task.find({ section: section._id });
        section._doc.tasks = tasks;
      }
      res.status(200).json({ sections });
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res) => {
    const { sectionId } = req.params;
    const { title } = req.body;
    try {
      const section = await Section.findByIdAndUpdate(sectionId, {
        $set: {
          title: title,
        },
      });
      res.status(200).json({ section });
    } catch (err) {
      res.status(500).josn(err);
    }
  },

  delete: async (req, res, next) => {
    const { sectionId } = req.params;
    try {
      await Task.deleteMany({ section: sectionId });
      await Section.deleteOne({ _id: sectionId });
      res.status(200).json({ msg: "deleted" });
    } catch (err) {
      next(err);
    }
  },

  updatePosition: async (req, res, next) => {
    const userId = req.user._id;
    const { cardOrder } = req.body;
    try {
      await Board.findOneAndUpdate(
        { user: userId },
        {
          $set: {
            cardOrder,
          },
        }
      );
      res.status(200).json({ msg: "update success" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = SectionController;
