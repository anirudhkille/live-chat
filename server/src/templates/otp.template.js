export const otpTemplate = (otp) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Login OTP</title>
    </head>

    <body
      style="
        margin: 0;
        padding: 0;
        background-color: #f5f5f5;
        font-family: Arial, sans-serif;
      "
    >
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="padding: 40px 0"
      >
        <tr>
          <td align="center">
            <table
              width="600"
              cellpadding="0"
              cellspacing="0"
              style="
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
              "
            >
              <tr>
                <td
                  align="center"
                  style="
                    background: #111827;
                    color: white;
                    padding: 24px;
                    font-size: 24px;
                    font-weight: bold;
                  "
                >
                  Live Chat
                </td>
              </tr>

              <tr>
                <td style="padding: 32px">
                  <h2 style="margin-top: 0">
                    Verify Your Email
                  </h2>

                  <p>
                    Use the OTP below to complete your login.
                  </p>

                  <div
                    style="
                      margin: 30px 0;
                      text-align: center;
                    "
                  >
                    <span
                      style="
                        display: inline-block;
                        font-size: 32px;
                        letter-spacing: 8px;
                        font-weight: bold;
                        color: #111827;
                        padding: 16px 24px;
                        border-radius: 8px;
                        background: #f3f4f6;
                      "
                    >
                      ${otp}
                    </span>
                  </div>

                  <p>
                    This OTP will expire in
                    <strong>5 minutes</strong>.
                  </p>

                  <p>
                    If you didn't request this login,
                    you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <tr>
                <td
                  align="center"
                  style="
                    padding: 20px;
                    background: #f9fafb;
                    color: #6b7280;
                    font-size: 12px;
                  "
                >
                  © ${new Date().getFullYear()} BasketFlow
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};
