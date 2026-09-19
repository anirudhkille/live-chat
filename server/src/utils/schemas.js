import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email can't be empty")
  .email("Invalid email");

export const cuidSchema = z.string().cuid("Invalid user id");

export const keySchema = z.string().min(1, "Key can't be empty");

export const contentTypeSchema = z
  .string()
  .min(1, "Content type can't be empty");

export const fileNameSchema = z.string().min(1, "File name can't be empty");

export const fileSizeSchema = z.number().min(1, "File size can't be empty");

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color");
