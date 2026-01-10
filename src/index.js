
import app from './app.js';
import connectDB from './config/database.js'; // Import connectDB

console.log('[SERVER] Iniciando Wardrobe API...');

// Connect to Database
connectDB(); // Call connectDB to establish connection

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`[SERVER] Wardrobe API corriendo en http://localhost:${PORT}`);
});
