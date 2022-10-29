const Section = require('../../model/Board/Section')
const Task = require('../../model/Board/Task')

const TaskController = {

    create: async (req, res, next) => {
      const { sectionId, taskContent, taskTitle } = req.body
      try {
        const task = await Task.create({
          section: sectionId,
          content: taskContent,
          title: taskTitle
        })
        await task.save()
        await Section.findByIdAndUpdate(
          sectionId,
          { $push:{
            taskOrder: task._id
          }}
        )
        res.status(201).json({task})
      } catch (err) {
        next(err)
      }
    },
    
    update: async (req, res, next) => {
      const { taskId } = req.params
      const {title, content} = req.body
      
      try {
        await Task.findByIdAndUpdate(
          taskId,
          { $set: {
            title,
            content
          } }, {new: true}
        )
        res.status(200).json({msg: "update task success!!!"})
      } catch (err) {
        next(err)
      }
    },
    
    delete: async (req, res, next) => {
      const { taskId } = req.params
      try {
        const currentTask = await Task.findByIdAndDelete(taskId)
        await Section.findByIdAndUpdate(
          currentTask.section,
          {
            $pull:{
              taskOrder: currentTask._id
            }
          }
        )
        res.status(200).json({msg: 'deleted'})
      } catch (err) {
        next(err)
      }
    },
    
    updatePosition: async(req, res, next) => {
      const { taskOrder, sectionId, sectionIdAdded, taskId } = req.body
      try {
        if(sectionIdAdded){
          await Task.findByIdAndUpdate(
            taskId,
            {$set: {
              section: sectionIdAdded
            }}
          )
        }
        await Section.findByIdAndUpdate(
          sectionId,
          {$set: {
            taskOrder
          }}
        )
        res.status(200).json({msg: "update success"})
      } catch (err) {
        next(err)
      }
    }
}

module.exports = TaskController
