import { env } from "../config/env.config.js";
import { resend } from "../config/mail.js";

export const sendEmail = async (email, subject, html) => {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: subject,
    html: html,
  });

  if (error) {
    throw new Error(error.message);
  }
};
