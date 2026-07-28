import User from "./userModel.js";

export const create = (email) => {
  return User.create({ email });
};

export const findEmail = (email) => {
  return User.findOne({ email });
};

export const findById = (id) => {
  return User.findById(id);
};

export const updateById = (id, data) => {
  return User.findByIdAndUpdate(id, data, { new: true });
};
