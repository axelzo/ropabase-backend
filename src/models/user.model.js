import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: false, // Assuming password might not be required for social logins
  },
  image: {
    type: String,
    required: false,
  },
  emailVerified: {
    type: Date,
    required: false,
  },
  // We will reference clothing items, not embed them.
  clothingItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClothingItem',
  }],
  // Hash SHA-256 del refresh token activo.
  // select: false → no se retorna en queries por defecto (seguridad).
  refreshToken: {
    type: String,
    required: false,
    select: false,
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
