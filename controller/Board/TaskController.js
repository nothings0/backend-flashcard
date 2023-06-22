const Section = require("../../model/Board/Section");
const Task = require("../../model/Board/Task");
const schedule = require("node-schedule");
const Notification = require("../../model/Notification");

const TaskController = {
  create: async (req, res, next) => {
    const { sectionId, taskContent, taskTime } = req.body;
    const userId = req.user._id;
    try {
      const currentDate = new Date();
      const task = await Task.create({
        section: sectionId,
        content: taskContent,
        time: taskTime,
      });
      await task.save();
      if (currentDate <= task.time) {
        schedule.scheduleJob(task._id.toString(), task.time, async () => {
          const content = `you have work up to now: ${taskTime}: ${taskContent}`;
          const notifi = new Notification({ content, user: userId });
          await notifi.save();
        });
      }
      await Section.findByIdAndUpdate(sectionId, {
        $push: {
          taskOrder: task._id,
        },
      });
      res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  },

  update: async (req, res, next) => {
    const { taskId } = req.params;
    const { content, time } = req.body;
    const date = new Date(time);
    const userId = req.user._id;
    try {
      await Task.findByIdAndUpdate(
        taskId,
        {
          $set: {
            content,
            time: date,
          },
        },
        { new: true }
      );
      const existingJob = schedule.scheduledJobs[taskId.toString()];

      if (existingJob) {
        existingJob.cancel();
      }
      schedule.scheduleJob(taskId.toString(), date, async () => {
        const contentNoti = `you have work up to now: ${time}: ${content}`;
        const notifi = new Notification({ content: contentNoti, user: userId });
        await notifi.save();
      });
      res.status(200).json({ msg: "update task success!!!" });
    } catch (err) {
      next(err);
    }
  },

  delete: async (req, res, next) => {
    const { taskId } = req.params;
    try {
      const currentTask = await Task.findByIdAndDelete(taskId);
      await Section.findByIdAndUpdate(currentTask.section, {
        $pull: {
          taskOrder: currentTask._id,
        },
      });
      res.status(200).json({ msg: "deleted" });
    } catch (err) {
      next(err);
    }
  },

  updatePosition: async (req, res, next) => {
    const { taskOrder, sectionId, sectionIdAdded, taskId } = req.body;
    try {
      if (sectionIdAdded) {
        await Task.findByIdAndUpdate(taskId, {
          $set: {
            section: sectionIdAdded,
          },
        });
      }
      await Section.findByIdAndUpdate(sectionId, {
        $set: {
          taskOrder,
        },
      });
      res.status(200).json({ msg: "update success" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TaskController;
