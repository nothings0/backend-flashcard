const Section = require('../../model/Board/Section')
const Board = require('../../model/Board/Board')
const Task = require('../../model/Board/Task')

const BoardController = {
    create: async (req, res) => {
        const userId = req.user.id
        const {title} = req.body
        try {
          const board = await Board.create({
            user: userId,
            title: title
          })
          await board.save()
          res.status(201).json({board})
        } catch (err) {
          next(err)
        }
    },
    get: async (req, res, next) => {
      const userId = req.user.id
      try {
        const board = await Board.findOne({ user: userId })
        if(!board) return res.status(400).json({
          msg: "board not found!",
          err: 400
        })
        const sections = await Section.find({ board: board._id })
        for (const section of sections) {
          const tasks = await Task.find({ section: section._id })
          section._doc.tasks = tasks
        }
        res.status(200).json({board, sections})
      } catch (err) {
        next(err)
      }
    },
    update: async (req, res, next) => {
        const { boardId } = req.params
        const {title} = req.body
        try {
          await Board.findByIdAndUpdate(
            boardId,
            { $set: {
              title: title
            } }
          )
          res.status(200).json({msg: "Update success"})
        } catch (err) {
          next(err)
        }
    }
}

module.exports = BoardController
