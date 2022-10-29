const Notification = require("../model/Notification")

const NotificationController = {
    GetNotifi: async (req, res, next) => {
        const userId = req.user._id
        try {
            const notifis = await Notification.find({user: userId}).limit(5)
            res.status(200).json(notifis)
        } catch (error) {
            next(error)
        }
    },

    CreateNotifi: async (req, res, next) => {
        try {
            const {content, userId} = req.body
            const notifi = new Notification({content, user: userId})
            await notifi.save()

            res.status(201).json({msg: "Created Notification!!!"})
        } catch (error) {
            next(error)
        }
    },
    ReadNotifi: async (req, res, next) => {
        try {
            const {notifiId} = req.body
            const notifi = await Notification.findByIdAndUpdate(notifiId, {
                $set:{
                    isRead: true
                }
            }, {new: true})
            res.status(200).json(notifi)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = NotificationController