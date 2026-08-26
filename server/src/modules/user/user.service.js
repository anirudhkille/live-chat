import { AppError } from "../../utils/AppError.js";
import * as userRepository from "./user.repository.js";

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

export const updateUser = async (id, data) => {
  return userRepository.updateById(id, data);
};

export const searchUser = async (search, page, limit,id) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return userRepository.searchUser(search, safePage, safeLimit,id);
};
