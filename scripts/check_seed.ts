import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

async function check() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  admin.initializeApp({ projectId: firebaseConfig.projectId });
  const db = getFirestore(firebaseConfig.firestoreDatabaseId);
  
  const schools = await db.collection('schools').get();
  console.log(`Total schools: ${schools.size}`);
  schools.forEach(doc => {
    console.log(` - School: ${doc.id} (${doc.data().name})`);
  });

  const users = await db.collection('users').where('role', '==', 'operator').get();
  console.log(`Total operators: ${users.size}`);
}

check().catch(console.error);
