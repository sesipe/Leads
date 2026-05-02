import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

async function check() {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log("Checking schools...");
  const schoolsSnap = await getDocs(collection(db, 'schools'));
  console.log(`Total schools: ${schoolsSnap.size}`);
  schoolsSnap.forEach(doc => {
    console.log(` - School: ${doc.id} (${doc.data().name})`);
  });

  console.log("\nChecking users...");
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Total users: ${usersSnap.size}`);
  usersSnap.forEach(doc => {
    if (doc.data().role === 'operator') {
      console.log(` - Operator: ${doc.data().email} (School: ${doc.data().schoolId})`);
    }
  });
}

check().catch(console.error);
