const Banner = require('../model/Banner');

const BannerController = {
// Create a new banner
createBanner: async (req, res) => {
    try {
      const { title, description, img } = req.body;
  
      // Validate required fields
      if (!img) {
        return res.status(400).json({ message: 'Image URL is required' });
      }
  
      const banner = new Banner({
        title: title || '',
        description: description || '',
        img,
      });
  
      const savedBanner = await banner.save();
      res.status(201).json({
        message: 'Banner created successfully',
        banner: savedBanner,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error creating banner', error: error.message });
    }
  },
  
  // Get all banners
  getAllBanners: async (req, res) => {
    try {
      const banners = await Banner.find().sort({ createdAt: -1 });
      res.status(200).json({
        message: 'Banners retrieved successfully',
        banners,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving banners', error: error.message });
    }
  },
  
  // Get a single banner by ID
  getBannerById: async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid banner ID' });
      }
  
      const banner = await Banner.findById(id);
      if (!banner) {
        return res.status(404).json({ message: 'Banner not found' });
      }
  
      res.status(200).json({
        message: 'Banner retrieved successfully',
        banner,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving banner', error: error.message });
    }
  },
  
  // Update a banner by ID
  updateBanner: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, img } = req.body;
  
      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid banner ID' });
      }
  
      // Validate required fields
      if (img !== undefined && !img) {
        return res.status(400).json({ message: 'Image URL cannot be empty' });
      }
  
      const banner = await Banner.findById(id);
      if (!banner) {
        return res.status(404).json({ message: 'Banner not found' });
      }
  
      // Update fields
      banner.title = title !== undefined ? title : banner.title;
      banner.description = description !== undefined ? description : banner.description;
      banner.img = img !== undefined ? img : banner.img;
  
      const updatedBanner = await banner.save();
      res.status(200).json({
        message: 'Banner updated successfully',
        banner: updatedBanner,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating banner', error: error.message });
    }
  },
  
  // Delete a banner by ID
  deleteBanner: async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid banner ID' });
      }
  
      const banner = await Banner.findByIdAndDelete(id);
      if (!banner) {
        return res.status(404).json({ message: 'Banner not found' });
      }
  
      res.status(200).json({ message: 'Banner deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting banner', error: error.message });
    }
  }
}


module.exports = BannerController