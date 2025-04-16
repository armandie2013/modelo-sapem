import mongoose from "mongoose";
import dotenv from "dotenv";

// Cargar variables de entorno desde .env
dotenv.config();

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`🟢 MongoDB conectado en: ${conn.connection.host}`);
  } catch (error) {
    console.error("🔴 Error al conectar a MongoDB:", error.message);
    process.exit(1); // Corta la ejecución si falla la conexión
  }
};