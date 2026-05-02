import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
try {
  const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    console.log("Initializing Firebase Admin (Auto)");
    
    admin.initializeApp();
    
    if (firebaseConfig.firestoreDatabaseId) {
      console.log("Using Database ID directly in getFirestore:", firebaseConfig.firestoreDatabaseId);
      db = getFirestore(firebaseConfig.firestoreDatabaseId);
    } else {
      db = getFirestore();
    }
    console.log("Firebase Admin initialized successfully");
  } else {
    console.error("Firebase config file NOT FOUND at:", firebaseConfigPath);
  }
} catch (err) {
  console.error("Firebase Admin initialization failed:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middlewares
  app.use(cors());
  app.use(express.json());

  // Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);

  const apiRouter = express.Router();

  // API Route: Admin Create User
  apiRouter.post("/admin/create-user", async (req, res) => {
    const { email, password, name, role, schoolId } = req.body;

    if (!db) return res.status(500).json({ error: "Firebase Admin not initialized" });
    
    try {
      console.log(`[API] Creating user: ${email} (${role})`);
      
      // 1. Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });

      console.log(`[API] Auth user created: ${userRecord.uid}`);

      // 2. Create profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        name,
        role,
        schoolId: role === 'operator' ? schoolId : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[API] Firestore profile created: ${userRecord.uid}`);
      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("[API] ERROR creating user:", error);
      
      let clientMessage = "Erro ao processar criação de usuário.";
      if (error.code === 'auth/email-already-exists') clientMessage = "Este e-mail já está cadastrado.";
      if (error.code === 'auth/invalid-password') clientMessage = "A senha deve ter pelo menos 6 caracteres.";
      if (error.code === 'auth/invalid-email') clientMessage = "E-mail inválido.";
      
      res.status(400).json({ 
        success: false,
        error: clientMessage,
        details: error.message 
      });
    }
  });

  // API Route: Seed Data
  apiRouter.post("/admin/seed", async (req, res) => {
    let clientDb: any = null;
    let initStatus = "Attempting via Client SDK";

    try {
      const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(firebaseConfigPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
        
        // Initialize Client App
        const clientApp = initializeClientApp(firebaseConfig);
        clientDb = getClientFirestore(clientApp);
        
        // Initialize Admin if needed for Auth
        if (admin.apps.length === 0) {
          admin.initializeApp();
        }
      } else {
        return res.status(500).json({ error: "Config file not found" });
      }
    } catch (err: any) {
      return res.status(500).json({ error: "Initialization failed", details: err.message });
    }

    const schoolsData = [
      { name: 'SESI Vasco da Gama', codFilial: 504, cnpj: '03.910.210/0005-39', cep: '52081-005', address: 'Vasco da Gama', number: '145', neighborhood: 'Vasco da Gama', city: 'Recife', uf: 'PE', email: 'lilian.avelar@sistemafiepe.org.br', phone: '(81) 99933-7502' },
      { name: 'SESI Ibura', codFilial: 505, cnpj: '03.910.210/0003-77', cep: '51230-000', address: 'Ministro Oliveira Salazar', number: '228', neighborhood: 'Ibura', city: 'Recife', uf: 'PE', email: 'escolasesiibura@sistemafiepe.org.br', phone: '(81) 8877-0893' },
      { name: 'SESI Camaragibe', codFilial: 506, cnpj: '03.910.210/0008-81', cep: '54759-550', address: 'Rua Severino Santos', number: '343', neighborhood: 'Vila da Fábrica', city: 'Camaragibe', uf: 'PE', email: 'adelson.barbosa@sistemafiepe.org.br', phone: '(81) 98899-1759' },
      { name: 'SESI Paulista', codFilial: 507, cnpj: '03.910.210/0009-62', cep: '53417-040', address: 'Travessa São Pedro', number: '2800', neighborhood: 'Artur Lundgren I', city: 'Paulista', uf: 'PE', email: 'swelyn.teixeira@sistemafiepe.org.br', phone: '(81) 98481-4448' },
      { name: 'SESI Cabo de Santo Agostinho', codFilial: 510, cnpj: '03.910.210/0011-87', cep: '54505-000', address: 'Rodovia BR 101 Sul, Km 36', number: '34700', neighborhood: 'Charneca', city: 'Cabo de Santo Agostinho', uf: 'PE', email: 'tatiane.souza@sistemafiepe.org.br', phone: '(81) 3521-9192' },
      { name: 'SESI Escada', codFilial: 511, cnpj: '03.910.210/0010-04', cep: '55500-000', address: 'Avenida Visconde de Utinga', number: 'S/N', neighborhood: 'Centro', city: 'Escada', uf: 'PE', email: 'rivaldo.martins@sistemafiepe.org.br', phone: '(81) 98678-8728' },
      { name: 'SESI Goiana', codFilial: 513, cnpj: '03.910.210/0014-20', cep: '55900-000', address: 'Rua Poço do Rei', number: 'S/N', neighborhood: 'Centro', city: 'Goiana', uf: 'PE', email: 'alzira.assis@sistemafiepe.org.br', phone: '(81) 98622-0060' },
      { name: 'SESI Caruaru', codFilial: 515, cnpj: '03.910.210/0017-72', city: 'Caruaru', uf: 'PE' },
      { name: 'SESI Petrolina', codFilial: 517, cnpj: '03.910.210/0019-34', cep: '56304-185', address: 'Rua Projetada, Parque Municipal', number: '1', neighborhood: 'Centro', city: 'Petrolina', uf: 'PE', email: 'tacianna.gomes@sistemafiepe.org.br', phone: '(87) 98827-7694' },
      { name: 'SESI Araripina', codFilial: 518, cnpj: '03.910.210/0018-53', cep: '56280-000', address: 'Estrada Araripina–Gergelim', number: 'S/N', neighborhood: 'Vila Santa Maria', city: 'Araripina', uf: 'PE', email: 'maria.rodrigues@sistemafiepe.org.br', phone: '(87) 99171-3533' },
      { name: 'SESI Moreno', codFilial: 524, cnpj: '03.910.210/0016-91', cep: '54803-006', address: 'Av. Cleto Campelo', number: '2713', neighborhood: 'Centro', city: 'Moreno', uf: 'PE', email: 'gilvaneide.verissimo@sistemafiepe.org.br', phone: '(81) 98877-0437' },
      { name: 'SESI Belo Jardim', codFilial: 501, cnpj: '03.910.210/0022-30', cep: '55154-015', address: 'Coronel Antonio Marinho', number: '120', neighborhood: 'Ayrton Maciel', city: 'Belo Jardim', uf: 'PE', email: 'izabelle.silva@sistemafiepe.org.br', phone: '(81) 99707-2172' },
    ];

    const results = [];

    for (const sh of schoolsData) {
      try {
        const schoolId = sh.name.toLowerCase().replace(/sesi\s+/, '').replace(/\s+/g, '');
        
        // Register School (Client SDK)
        await setDoc(doc(clientDb, 'schools', schoolId), {
          id: schoolId,
          ...sh,
          active: true
        });

        // Register User (Admin SDK for Auth, Client SDK for Firestore Profile)
        const userShortName = schoolId;
        const userEmail = `${userShortName}@sistemafiepe.org.br`;
        const userPass = `${userShortName}@1234`;
        const userName = sh.name.replace(/SESI\s+/, '');

        try {
          const userRecord = await admin.auth().createUser({
            email: userEmail,
            password: userPass,
            displayName: userName,
          });

          await setDoc(doc(clientDb, 'users', userRecord.uid), {
            uid: userRecord.uid,
            email: userEmail,
            name: userName,
            role: 'operator',
            schoolId: schoolId,
            createdAt: serverTimestamp(),
          });

          results.push({ school: sh.name, status: 'success', user: userEmail });
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-exists') {
             // If auth user exists, try to update firestore profile anyway if UID is missing or something
             results.push({ school: sh.name, status: 'user auth already exists', user: userEmail });
          } else {
            console.error(`Error creating user for ${sh.name}:`, authErr);
            results.push({ school: sh.name, status: 'error user', error: authErr.message });
          }
        }
      } catch (schoolErr: any) {
        console.error(`Error registering school ${sh.name}:`, schoolErr);
        results.push({ school: sh.name, status: 'error school', error: schoolErr.message, code: schoolErr.code });
      }
    }

    res.json({ success: true, results, initStatus });
  });

  // Health check
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Test Email Configuration
  apiRouter.post("/test-email", async (req, res) => {
    const { config, testEmail } = req.body;
    if (!config || !testEmail) return res.status(400).json({ error: "Configuration and test email are required" });

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
      await transporter.verify();
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: testEmail,
        subject: "Teste de Conexão - SESI Pernambuco",
        text: "Sua configuração de e-mail foi validada com sucesso!",
        html: "<b>Sua configuração de e-mail foi validada com sucesso!</b>",
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[API] SMTP Test Error:", error);
      res.status(500).json({ error: error.message || "Falha na conexão SMTP" });
    }
  });

  // API Route: Send Confirmation Email
  apiRouter.post("/send-confirmation", async (req, res) => {
    const { email, name, schoolName, gradeName, courseName } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });

    try {
      let emailConfig = {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        fromName: process.env.EMAIL_FROM_NAME || 'SESI PE',
        fromEmail: process.env.EMAIL_FROM_ADDRESS
      };

      let customTemplate = null;
      if (db) {
        const settingsSnap = await db.collection('settings').doc('app').get();
        if (settingsSnap.exists) {
          const data = settingsSnap.data();
          if (data?.emailConfig) {
             const cfg = data.emailConfig;
             emailConfig = { ...emailConfig, ...cfg, port: Number(cfg.port || emailConfig.port) };
          }
          if (data?.confirmationEmailTemplate) customTemplate = data.confirmationEmailTemplate;
        }
      }

      const transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.port === 465,
        auth: { user: emailConfig.user, pass: emailConfig.pass },
      });

      const htmlContent = customTemplate 
        ? customTemplate.replace(/\{name\}/g, name).replace(/\{schoolName\}/g, schoolName).replace(/\{gradeName\}/g, gradeName).replace(/\{courseName\}/g, courseName)
        : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;"><h2>Olá, ${name}!</h2><p>Ficamos muito felizes com o seu interesse na Rede SESI de Educação.</p><p>Confirmamos o recebimento dos seus dados.</p></div>`;

      if (!emailConfig.user || !emailConfig.pass) {
        console.log("[API] Skip email (no credentials)");
        return res.json({ success: true, message: "Logged" });
      }

      await transporter.sendMail({
        from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
        to: email,
        subject: "Confirmação de Interesse - SESI Pernambuco",
        html: htmlContent,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[API] Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Catch-all for API to prevent fallthrough to Vite
  apiRouter.all("*", (req, res) => {
    console.log(`[API] 404 - Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
  });

  // Use the router
  app.use("/api", apiRouter);

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

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("GLOBAL ERROR:", err);
    res.status(500).json({ 
      success: false, 
      error: "Erro interno no servidor",
      details: err.message || String(err)
    });
  });
}

startServer();
