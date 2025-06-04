const nodemailer = require("nodemailer");
require("dotenv").config();

const sendMail = async (to, url, type) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.PASS_MAIL,
      },
    });
    if (type === "register") {
      const result = await transporter.sendMail({
        from: "<sp.fluxquiz@gmail.com>",
        to: to,
        subject: "ĐĂNG KÝ TÀI KHOẢN - FLUXQUIZ",
        html: `
                  <div style="max-width: 700px; margin:auto; border: 10px solid #349eff; padding: 50px 20px; font-size: 110%;">
                  <h2 style="text-align: center; text-transform: uppercase;color: #349eff;">WElCOME to FLUXQUIZ.COM</h2>
                  <p>
                  Chào mừng!. Bạn hãy nhấp vào nút bên dưới để xác thực địa chỉ email của bạn."
                  </p>
                  
                  <a href="${url}" style="background: crimson; text-decoration: none; color: white; padding: 10px 20px; margin: 10px 0; display: inline-block;">Xác thực địa chỉ email</a>
              
                  <p>Nếu nút không hoạt động vì bất kỳ lý do gì, bạn cũng có thể nhấp vào liên kết bên dưới để xác thực</p>
              
                  <div>${url}</div>
                  </div>
    
                  <p>From <a href="https://fluxquiz.netlify.app">Fluxquiz</a> With Love</p>
                `,
      });
      return result;
    } else if (type === "forgotpassword") {
      const result = await transporter.sendMail({
        from: "<sp.fluxquiz@gmail.com>",
        to: to,
        subject: "QUÊN MẬT KHẨU - FLUXQUIZ",
        html: `
                  <div style="max-width: 700px; margin:auto; border: 10px solid #349eff; padding: 50px 20px; font-size: 110%;">
                  <h2 style="text-align: center; text-transform: uppercase;color: #349eff;">WElCOME to FLUXQUIZ.COM</h2>
                  <p>Bạn hãy nhấp vào nút bên dưới để tiến hành lấy lại mật khẩu fluxquiz.com 
                  </p>
                  
                  <a href="${url}" style="background: crimson; text-decoration: none; color: white; padding: 10px 20px; margin: 10px 0; display: inline-block;">Lấy lại mật khẩu fluxquiz</a>
              
                  <p>Nếu nút không hoạt động vì bất kỳ lý do gì, bạn cũng có thể nhấp vào liên kết bên dưới để xác thực</p>
              
                  <div>${url}</div>
                  </div>
    
                  <p>From <a href="https://fluxquiz.netlify.app">Fluxquiz.netlify.app</a> With Love</p>
                `,
      });
      return result;
    } else if (type === "contact") {
      const result = await transporter.sendMail({
        from: "<sp.fluxquiz@gmail.com>",
        to: to,
        subject: `THÔNG BÁO - FLUXQUIZ`,
        html: `
                  <div style="max-width: 700px; margin:auto; border: 10px solid #349eff; padding: 50px 20px; font-size: 110%;">
                  <h2 style="text-align: center; text-transform: uppercase;color: #349eff;">WElCOME to FLUXQUIZ.COM</h2>
                  <p>
                    Liên hệ từ FLUXQUIZ
                  </p>
                  <p>${url}</p>
                  </div>
    
                  <p>From <a href="https://fluxquiz.netlify.app">Fluxquiz.netlify.app</a> With Love</p>
                `,
      });
      return result;
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendMail;
