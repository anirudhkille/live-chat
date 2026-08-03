import { env } from "../config/env.config.js";
import { transporter } from "../config/mail.js";

export const sendEmail = async (email, subject, html) => {
  await transporter.sendMail({
    from: env.SMTP_EMAIL,
    to: email,
    subject: subject,
    html: html,
  });
};
