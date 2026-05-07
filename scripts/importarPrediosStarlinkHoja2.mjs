import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import xlsx from "xlsx";

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/ctsapem";

const COLLECTION_NAME = process.env.COLLECTION_NAME || "predioescuelas";

const EXCEL_PATH = path.resolve(
  "Predios Escolares con STARLINK y predios starlink INET.xlsx"
);

const SHEET_NAME = "Hoja1";

function normalizarTexto(valor, fallback = "") {
  const texto = String(valor ?? "").trim();
  return texto || fallback;
}

function normalizarNumeroComoTexto(valor, fallback = "0") {
  if (valor === null || valor === undefined || valor === "") {
    return fallback;
  }

  if (typeof valor === "number") {
    if (Number.isNaN(valor)) return fallback;
    return String(Math.trunc(valor));
  }

  const texto = String(valor).trim();

  if (!texto) return fallback;

  const soloNumeroDecimal = texto.match(/^(\d+)(\.0+)?$/);
  if (soloNumeroDecimal) {
    return soloNumeroDecimal[1];
  }

  return texto;
}

function normalizarMegabytes(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return 0;
  }

  const numero = Number(valor);

  if (Number.isNaN(numero) || numero < 0) {
    return 0;
  }

  return numero;
}

function normalizarTecnologia(valor) {
  const tecnologia = normalizarTexto(valor, "Satelital");

  const tecnologiaLower = tecnologia.toLowerCase();

  if (tecnologiaLower === "satelital") return "Satelital";
  if (tecnologiaLower === "ftth") return "FTTH";
  if (tecnologiaLower === "radioenlace") return "RADIOENLACE";
  if (tecnologiaLower === "radio enlace") return "Radio Enlace";

  return tecnologia;
}

async function main() {
  console.log("Conectando a MongoDB...");
  await mongoose.connect(MONGO_URI);

  console.log("Conectado correctamente.");
  console.log("Base usada:", mongoose.connection.name);
  console.log("Colección destino:", COLLECTION_NAME);
  console.log("Excel:", EXCEL_PATH);
  console.log("Hoja usada:", SHEET_NAME);

  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(
      `No se encontró la hoja "${SHEET_NAME}". Hojas disponibles: ${workbook.SheetNames.join(", ")}`
    );
  }

  const filas = xlsx.utils.sheet_to_json(sheet, {
    defval: "",
  });

  console.log("Filas encontradas en la hoja:", filas.length);

  const ahora = new Date();

  const documentos = filas.map((fila) => {
    return {
      predio: normalizarNumeroComoTexto(fila["predio"], "0"),
      cue: normalizarNumeroComoTexto(fila["cue"], "0"),
      nombreEscuela: normalizarTexto(fila["nombre escuela"], "SIN DATOS"),
      direccion: normalizarTexto(fila["Domicilio"], "SIN DATOS"),
      ciudad: normalizarTexto(fila["ciudad"], "SIN DATOS"),
      departamento: normalizarTexto(fila["Departamento"], "SIN DATOS"),
      megabytesAsignados: normalizarMegabytes(fila["ab (mb)"]),
      isp: normalizarTexto(fila["proveedor"], "SIN DATOS"),
      tecnologia: normalizarTecnologia(fila["tecnologia"]),
      createdAt: ahora,
      updatedAt: ahora,
      __v: 0,
    };
  });

  const documentosValidos = documentos.filter((doc) => {
    return (
      doc.predio &&
      doc.cue &&
      doc.nombreEscuela &&
      doc.direccion &&
      doc.ciudad &&
      doc.departamento &&
      doc.isp &&
      doc.tecnologia
    );
  });

  console.log("Documentos preparados:", documentos.length);
  console.log("Documentos válidos para insertar:", documentosValidos.length);

  const conteoTecnologias = documentosValidos.reduce((acc, item) => {
    acc[item.tecnologia] = (acc[item.tecnologia] || 0) + 1;
    return acc;
  }, {});

  const conteoIsp = documentosValidos.reduce((acc, item) => {
    acc[item.isp] = (acc[item.isp] || 0) + 1;
    return acc;
  }, {});

  console.log("Tecnologías detectadas:", conteoTecnologias);
  console.log("ISP detectados:", conteoIsp);

  if (documentosValidos.length === 0) {
    console.log("No hay documentos para insertar.");
    await mongoose.disconnect();
    return;
  }

  const collection = mongoose.connection.collection(COLLECTION_NAME);

  /*
    IMPORTANTE:
    Usamos insertMany directamente sobre la colección.
    No usamos upsert.
    No buscamos duplicados.
    Todo lo que venga en la hoja se inserta como registro nuevo.
  */
  const resultado = await collection.insertMany(documentosValidos, {
    ordered: false,
  });

  console.log("Importación finalizada.");
  console.log("Insertados:", resultado.insertedCount);

  await mongoose.disconnect();
  console.log("Conexión cerrada.");
}

main().catch(async (error) => {
  console.error("Error al importar predios Starlink:");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});