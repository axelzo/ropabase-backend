import mongoose from 'mongoose';

const clothingItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['SHIRT', 'PANTS', 'SHOES', 'JACKET', 'ACCESSORY', 'OTHER'],
  },
  color: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: false,
  },
  imageUrl: {
    type: String,
    required: false,
  },
  imagePublicId: { // Nuevo campo para almacenar el Public ID de Cloudinary
    type: String,
    required: false,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

const ClothingItem = mongoose.model('ClothingItem', clothingItemSchema);

export default ClothingItem;
