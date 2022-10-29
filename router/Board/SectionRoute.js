const router = require('express').Router()
const SectionController = require('../../controller/Board/SectionController')
const {verifyToken} = require('../../middleware/index')

router.route('/')
.get(verifyToken, SectionController.get)
.post(verifyToken, SectionController.create)
.put(verifyToken, SectionController.updatePosition)

router.route('/:sectionId')
.put(verifyToken, SectionController.update)
.delete(verifyToken, SectionController.delete)

module.exports = router