import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  async sendResetCode(email: string, code: string) {
    console.log('Before sendMail');

    await this.transporter.sendMail({
      from: `"Nairo" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Reset your Nairo password',

      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f4f5;
  font-family:Inter,Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:40px 20px;">

<table
width="600"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:18px;
overflow:hidden;
box-shadow:0 12px 40px rgba(0,0,0,.08);
">

<tr>
<td align="center" style="padding:48px 40px 24px;">

<h1 style="
margin:24px 0 10px;
font-size:28px;
font-weight:700;
color:#111827;
">
Reset your password
</h1>

<p style="
margin:0;
font-size:16px;
line-height:28px;
color:#6b7280;
">
We received a request to reset your password.
</p>

<p style="
margin:6px 0 0;
font-size:16px;
line-height:28px;
color:#6b7280;
">
Enter the verification code below.
</p>

</td>
</tr>

<tr>
<td align="center">

<div style="
display:inline-block;
margin:18px 0 38px;
padding:22px 42px;
background:#f8f5ff;
border:2px solid #8b53ff;
border-radius:16px;
">

<span style="
font-size:42px;
font-weight:800;
letter-spacing:14px;
color:#8b53ff;
">
${code}
</span>

</div>

</td>
</tr>

<tr>
<td style="padding:0 50px;">

<div style="
background:#f9fafb;
border-radius:14px;
padding:20px;
">

<p style="
margin:0;
font-size:15px;
line-height:26px;
color:#4b5563;
">

⏱ This code expires in
<strong>10 minutes</strong>.

</p>

</div>

</td>
</tr>

<tr>
<td style="padding:36px 50px 18px;">

<p style="
margin:0;
font-size:15px;
line-height:28px;
color:#6b7280;
">

If you didn't request a password reset,
you can safely ignore this email.

</p>

</td>
</tr>

<tr>
<td align="center" style="
padding:28px;
border-top:1px solid #eeeeee;
">

<p style="
margin:0;
font-size:13px;
color:#9ca3af;
">

© ${new Date().getFullYear()} Nairo.
All rights reserved.

</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
    });
    
    console.log('After sendMail');
  }
}
