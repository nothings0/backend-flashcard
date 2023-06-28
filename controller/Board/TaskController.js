const Section = require("../../model/Board/Section");
const Task = require("../../model/Board/Task");
const schedule = require("node-schedule");
const Notification = require("../../model/Notification");
const mongoose = require("mongoose");
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
    const userId = req.user._id;
    try {
      await Task.findByIdAndUpdate(
        taskId,
        {
          $set: {
            content,
            time,
          },
        },
        { new: true }
      );
      const existingJob = schedule.scheduledJobs[taskId.toString()];

      if (existingJob) {
        existingJob.cancel();
      }
      schedule.scheduleJob(taskId.toString(), time, async () => {
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
    const { taskId, sectionId } = req.body;
    console.log(taskId, sectionId);
    try {
      await Task.findByIdAndDelete(taskId);
      await Section.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(sectionId) },
        {
          $pull: {
            taskOrder: taskId,
          },
        }
      ),
        res.status(200).json({ msg: "deleted" });
    } catch (err) {
      next(err);
    }
  },

  updatePosition: async (req, res, next) => {
    const { taskOrder, sectionId, sectionIdAdded, taskId } = req.body;
    try {
      if (sectionIdAdded !== sectionId) {
        await Task.findByIdAndUpdate(taskId, {
          $set: {
            section: sectionIdAdded,
          },
        });
      }
      const sectionPromise = Promise.all([
        Section.findByIdAndUpdate(sectionIdAdded, {
          $set: {
            taskOrder,
          },
        }),
        Section.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(sectionId) },
          {
            $pull: {
              taskOrder: taskId,
            },
          }
        ),
      ]);
      await sectionPromise;
      res.status(200).json({ msg: "update success" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TaskController;
