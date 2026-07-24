import { AppError } from "../../utils/AppError.js";
import * as userRepository from "./user.repository.js";

export const findUserByEmail = async (email) => {
  return userRepository.findEmail(email);
};

export const findUserByEmailOrThrow = async (email) => {
  const user = await userRepository.findEmail(email);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

export const createUser = async (email) => {
  return userRepository.create(email);
};

export const findUserByIdOrThrow = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};
