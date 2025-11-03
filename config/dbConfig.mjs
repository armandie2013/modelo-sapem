import mongoose from "mongoose";
import dotenv from "dotenv";

// Cargar nuevas variables de entorno desde el archivo .env
dotenv.config();

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`🟢 MongoDB conectado en: ${conn.connection.host}`);
  } catch (error) {
    console.error("🔴 Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }
};