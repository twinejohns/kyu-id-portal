import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let testAccountInfo: { user: string; pass: string } | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Generate test credentials dynamically for Ethereal email
  const testAccount = await nodemailer.createTestAccount();
  testAccountInfo = testAccount;
  
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  return transporter;
}

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"KyU ID Portal" <noreply@kyu.ac.ug>',
      to,
      subject,
      html,
    });
    
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    console.log(`(Credentials used: ${testAccountInfo?.user} / ${testAccountInfo?.pass})`);
    
    return info;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
}
