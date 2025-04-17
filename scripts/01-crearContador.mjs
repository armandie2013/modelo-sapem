import mongoose from "mongoose";
import Contador from "../models/contador.mjs";
import dotenv from "dotenv";

dotenv.config(); // para usar MONGODB_URI si tenés .env

// Conexión a la base (modificá si no usás .env)
await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/sapem");

try {
  const contador = await Contador.findOneAndUpdate(
    { nombre: "numeroDeViaje" },
    { $setOnInsert: { valor: 1 } },  // si no existe, lo crea con valor 1
    { upsert: true, new: true }
  );

  console.log("✅ Contador inicializado:", contador);
} catch (error) {
  console.error("❌ Error al crear el contador:", error);
} finally {
  await mongoose.disconnect();
}