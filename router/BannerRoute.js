const express = require('express');
const router = express.Router();
const bannerController = require('../controller/BannerController');

router.post('/', bannerController.createBanner);
router.get('/', bannerController.getAllBanners);
router.get('/:id', bannerController.getBannerById);
router.patch('/:id', bannerController.updateBanner);
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;