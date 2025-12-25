// tests/helpers/factory.js
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const User = mongoose.model('HwUser');
const Item = mongoose.model('HwItem');

export const createUser = async (userData) => {
  const passwordHash = await bcrypt.hash(userData.password, 12);
  const user = new User({ ...userData, passwordHash, emailVerified: true });
  await user.save();
  return user;
};

export const createItem = async (itemData) => {
  const item = new Item(itemData);
  await item.save();
  return item;
};

export const generateToken = (user) => {
  return jwt.sign({ sub: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};
