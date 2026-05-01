import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
  
  if (firebaseConfig.firestoreDatabaseId) {
    db = admin.firestore(firebaseConfig.firestoreDatabaseId);
  } else {
    db = admin.firestore();
  }
  console.log("Firebase Admin initialized successfully");
} catch (err) {
  console.error("Firebase Admin initialization failed:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json());

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Test Email Configuration
  app.post("/api/test-email", async (req, res) => {
    const { config, testEmail } = req.body;

    if (!config || !testEmail) {
      return res.status(400).json({ error: "Configuration and test email are required" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: Number(config.port),
        secure: Number(config.port) === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      // Verify connection configuration
      await transporter.verify();

      // Send actual test email
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: testEmail,
        subject: "Teste de Conexão - SESI Pernambuco",
        text: "Sua configuração de e-mail foi validada com sucesso!",
        html: "<b>Sua configuração de e-mail foi validada com sucesso!</b>",
      });

      res.json({ success: true });
    } catch (error) {
      console.error("SMTP Test Error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Falha na conexão SMTP" 
      });
    }
  });

  // API Route: Send Confirmation Email
  app.post("/api/send-confirmation", async (req, res) => {
    const { email, name, schoolName, gradeName, courseName } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    try {
      // Default to env variables
      let emailConfig = {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        fromName: process.env.EMAIL_FROM_NAME || 'SESI PE',
        fromEmail: process.env.EMAIL_FROM_ADDRESS
      };

      let customTemplate = null;

      // Try to sync with Firestore settings if available
      if (db) {
        try {
          const settingsSnap = await db.collection('settings').doc('app').get();
          if (settingsSnap.exists) {
            const data = settingsSnap.data();
            if (data?.emailConfig) {
               const cfg = data.emailConfig;
               emailConfig = {
                 host: cfg.host || emailConfig.host,
                 port: Number(cfg.port) || emailConfig.port,
                 user: cfg.user || emailConfig.user,
                 pass: cfg.pass || emailConfig.pass,
                 fromName: cfg.fromName || emailConfig.fromName,
                 fromEmail: cfg.fromEmail || emailConfig.fromEmail
               };
            }
            if (data?.confirmationEmailTemplate) {
              customTemplate = data.confirmationEmailTemplate;
            }
          }
        } catch (dbErr) {
          console.error("Error reading settings from Firestore:", dbErr);
        }
      }

      // Lazy initialization of transporter
      const transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.port === 465,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.pass,
        },
      });

      const processedTemplate = customTemplate 
        ? customTemplate
            .replace(/\{name\}/g, name)
            .replace(/\{schoolName\}/g, schoolName)
            .replace(/\{gradeName\}/g, gradeName)
            .replace(/\{courseName\}/g, courseName)
        : null;

      const htmlContent = processedTemplate || `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #E30613;">Olá, ${name}!</h2>
            <p>Ficamos muito felizes com o seu interesse na Rede SESI de Educação.</p>
            <p>Confirmamos o recebimento dos seus dados para a seguinte unidade:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Unidade:</strong> ${schoolName}</p>
              <p><strong>Série:</strong> ${gradeName}</p>
              <p><strong>Curso/Oferta:</strong> ${courseName}</p>
            </div>
            <p>Em breve, nossa equipe entrará em contato para fornecer mais informações sobre o processo de matrícula e tirar suas dúvidas.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">Este é um e-mail automático. Por favor, não responda.</p>
            <p style="font-size: 12px; color: #666;"><strong>SESI Pernambuco</strong> - Transformando a Educação.</p>
          </div>
      `;

      const mailOptions = {
        from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
        to: email,
        subject: "Confirmação de Interesse - SESI Pernambuco",
        html: htmlContent,
      };

      // If no credentials anywhere, log and skip
      if (!emailConfig.user || !emailConfig.pass) {
        console.log("--- NO EMAIL CREDENTIALS CONFIGURED ---");
        console.log("To:", email);
        return res.json({ success: true, message: "Email logged (No credentials found in Settings or Env)" });
      }

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      
      // Ignore API routes
      if (url.startsWith('/api/')) {
        return next();
      }

      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("Serving static files from dist...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
