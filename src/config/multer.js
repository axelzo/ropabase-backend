
import multer from 'multer';

// Set up storage engine to store files in memory
const storage = multer.memoryStorage();

// Check file type
export function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  console.log(`[MULTER] Verificando tipo de archivo: ${file.originalname}, mimetype: ${file.mimetype}`);
  if (mimetype && filetypes.test(file.originalname.toLowerCase())) {
    console.log('[MULTER] Archivo permitido.');
    return cb(null, true);
  } else {
    console.log('[MULTER] Error: Solo se permiten imágenes.');
    cb('Error: Images Only!');
  }
}

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

export default upload;
