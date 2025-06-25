// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsybUqeyNm02rou16fl1-xQemntcLksGM",
  authDomain: "projekt-b2443.firebaseapp.com",
  projectId: "projekt-b2443",
  storageBucket: "projekt-b2443.firebasestorage.app",
  messagingSenderId: "441242827806",
  appId: "1:441242827806:web:8f9d3c9cee8bb3d8ee420f",
  measurementId: "G-MXM0PMLQ5R",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
