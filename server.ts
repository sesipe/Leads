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
let db: any = null;
let initError: string | null = null;

try {
  const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    console.log("Initializing Firebase Admin with Project ID:", firebaseConfig.projectId);
    
    // Check if already initialized
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    
    // Get Firestore instance with database ID
    if (firebaseConfig.firestoreDatabaseId) {
      console.log("Using Database ID:", firebaseConfig.firestoreDatabaseId);
      db = getFirestore(firebaseConfig.firestoreDatabaseId);
    } else {
      db = getFirestore();
    }
    console.log("Firebase Admin initialized successfully");
  } else {
    initError = "Config file not found";
    console.error(initError);
  }
} catch (err: any) {
  initError = err.message || String(err);
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

  // API Route: Debug Firebase Init
  apiRouter.get("/admin/init-status", (req, res) => {
    res.json({ 
      initialized: !!db, 
      error: initError,
      appsCount: admin.apps.length,
      projectId: admin.apps.length > 0 ? admin.app().options.projectId : null
    });
  });

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
      const profileData = {
        uid: userRecord.uid,
        email,
        name,
        role,
        schoolId: role === 'operator' ? schoolId : null,
        createdAt: serverTimestamp(),
      };

      // Try Admin SDK first, fallback to Client SDK if needed
      try {
        await db.collection('users').doc(userRecord.uid).set({
          ...profileData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (dbErr) {
        console.warn("[API] Admin SDK failed to write profile, trying Client SDK fallback...");
        const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
        const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
        const clientApp = initializeClientApp(firebaseConfig);
        const clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);
        await setDoc(doc(clientDb, 'users', userRecord.uid), profileData);
      }

      console.log(`[API] Firestore profile created: ${userRecord.uid}`);
      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("[API] ERROR creating user:", error);
      
      let clientMessage = "Erro ao processar criação de usuário.";
      if (error.code === 'auth/email-already-exists') {
        // If user exists, try to get their ID to return it
        try {
          const userRecord = await admin.auth().getUserByEmail(email);
          return res.json({ success: true, uid: userRecord.uid, alreadyExisted: true });
        } catch (e) {
          clientMessage = "Este e-mail já está cadastrado.";
        }
      }
      if (error.code === 'auth/invalid-password') clientMessage = "A senha deve ter pelo menos 6 caracteres.";
      if (error.code === 'auth/invalid-email') clientMessage = "E-mail inválido.";
      
      res.status(400).json({ 
        success: false,
        error: clientMessage,
        details: error.message 
      });
    }
  });

  // API Route: Seed Schools and Operators
  apiRouter.post("/admin/seed-schools", async (req, res) => {
    console.log("[SEED] Iniciando processo de geração de contas escolares...");
    
    let clientDb: any = null;
    try {
      const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(firebaseConfigPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
        const clientApp = initializeClientApp(firebaseConfig);
        clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);
      }
    } catch (e) {
      console.error("[SEED] Erro ao carregar Client SDK:", e);
    }

    if (!db && !clientDb) {
       return res.status(500).json({ 
         success: false, 
         error: "Firebase not initialized"
       });
    }

    const schoolsData = [
      { name: 'SESI Vasco da Gama', codFilial: 504, user: 'vascodagama' },
      { name: 'SESI Ibura', codFilial: 505, user: 'ibura' },
      { name: 'SESI Camaragibe', codFilial: 506, user: 'camaragibe' },
      { name: 'SESI Paulista', codFilial: 507, user: 'paulista' },
      { name: 'SESI Cabo de Santo Agostinho', codFilial: 510, user: 'cabo' },
      { name: 'SESI Escada', codFilial: 511, user: 'escada' },
      { name: 'SESI Goiana', codFilial: 513, user: 'goiana' },
      { name: 'SESI Caruaru', codFilial: 515, user: 'caruaru' },
      { name: 'SESI Petrolina', codFilial: 517, user: 'petrolina' },
      { name: 'SESI Araripina', codFilial: 518, user: 'araripina' },
      { name: 'SESI Moreno', codFilial: 524, user: 'moreno' },
      { name: 'SESI Belo Jardim', codFilial: 501, user: 'belojardim' },
    ];

    const results = [];

    for (const sh of schoolsData) {
      try {
        console.log(`[SEED] Processando: ${sh.name}...`);
        const schoolId = sh.user;
        const userEmail = `${sh.user}@sistemafiepe.org.br`;
        const userPass = `${sh.user}@1234`;
        const schoolName = sh.name.replace(/SESI\s+/, '');

        // 1. Create/Update School Record
        const schoolData = {
          id: schoolId,
          name: sh.name,
          codFilial: sh.codFilial,
          active: true,
          updatedAt: serverTimestamp()
        };

        if (clientDb) {
          await setDoc(doc(clientDb, 'schools', schoolId), schoolData, { merge: true });
        } else {
          await db.collection('schools').doc(schoolId).set(schoolData, { merge: true });
        }

        // 2. Create Auth User
        let uid = '';
        try {
          const userRecord = await admin.auth().createUser({
            email: userEmail,
            password: userPass,
            displayName: schoolName,
          });
          uid = userRecord.uid;
          results.push({ school: sh.name, status: 'created', email: userEmail });
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-exists') {
            const existingUser = await admin.auth().getUserByEmail(userEmail);
            uid = existingUser.uid;
            results.push({ school: sh.name, status: 'already_existed', email: userEmail });
          } else {
            console.error(`[SEED] Auth error for ${sh.name}:`, authErr.message);
            results.push({ school: sh.name, status: 'error_auth', error: authErr.message });
            continue; 
          }
        }

        // 3. Create/Update User Profile
        const profileData = {
          uid,
          email: userEmail,
          name: schoolName,
          role: 'operator',
          schoolId: schoolId,
          createdAt: serverTimestamp(),
        };

        if (clientDb) {
          await setDoc(doc(clientDb, 'users', uid), profileData, { merge: true });
        } else {
          await db.collection('users').doc(uid).set(profileData, { merge: true });
        }

      } catch (err: any) {
        console.error(`[SEED] General error for ${sh.name}:`, err.message);
        results.push({ school: sh.name, status: 'error', error: err.message });
      }
    }

    console.log("[SEED] Processo concluído.");
    res.json({ success: true, results });
  });

  // API Route: Setup Master Admin
  apiRouter.post("/admin/setup-master", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Firebase Admin not initialized" });
    
    try {
      const email = 'tablet.diretoriaeducacao@gmail.com';
      const pass = 'Abc@1234';
      const name = 'Admin SESI PE';
      
      console.log(`[SETUP] Creating master admin: ${email}`);
      
      let uid = '';
      try {
        const userRecord = await admin.auth().createUser({
          email,
          password: pass,
          displayName: name,
        });
        uid = userRecord.uid;
        console.log(`[SETUP] User created: ${uid}`);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-exists') {
          const existingUser = await admin.auth().getUserByEmail(email);
          uid = existingUser.uid;
          console.log(`[SETUP] User already exists: ${uid}`);
          
          // Update password if it already exists to ensure it's the right one
          await admin.auth().updateUser(uid, { password: pass });
        } else {
          throw authErr;
        }
      }

      // Ensure profile exists in Firestore
      await db.collection('users').doc(uid).set({
        uid,
        email,
        name,
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      res.json({ success: true, message: "Master admin setup complete", email, uid });
    } catch (err: any) {
      console.error("[SETUP] Error setting up master admin:", err);
      res.status(500).json({ 
        success: false, 
        error: err.message,
        details: err.code === 'auth/identity-toolkit-node-error' ? "Identity Toolkit API needs to be enabled" : null
      });
    }
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
