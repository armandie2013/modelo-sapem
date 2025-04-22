// services/authService.mjs

import Usuario from "../models/usuario.mjs";
import bcrypt from "bcrypt";

// Verifica si el email ya está registrado
export const verificarEmailExistente = async (email) => {
  return await Usuario.findOne({ email });
};

// Verifica si el DNI ya está registrado
export const verificarDniExistente = async (dni) => {
  return await Usuario.findOne({ dni });
};

// Crea un nuevo usuario con contraseña hasheada
export const crearUsuarioConHash = async ({ nombre, apellido, dni, email, password }) => {
  const passwordHash = await bcrypt.hash(password, 10);

  const nuevoUsuario = new Usuario({
    nombre,
    apellido,
    dni,
    email,
    password: passwordHash,
    rol: "usuario",
  });

  await nuevoUsuario.save();
};

// Busca un usuario por email
export const buscarUsuarioPorEmail = async (email) => {
  return await Usuario.findOne({ email });
};

// Valida si la contraseña ingresada es correcta
export const validarPassword = async (passwordIngresado, passwordHash) => {
  return await bcrypt.compare(passwordIngresado, passwordHash);
};
