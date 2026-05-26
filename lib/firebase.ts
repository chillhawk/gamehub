import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbdaNmzDYLB3GIruYgMX3kXo0BNOQ7Q8M",
  authDomain: "gamehub-90806.firebaseapp.com",
  projectId: "gamehub-90806",
  storageBucket: "gamehub-90806.firebasestorage.app",
  messagingSenderId: "538981238517",
  appId: "1:538981238517:web:5a0d7f3ef71c3374ece7bc",
  measurementId: "G-8C12HHYWPP"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, googleProvider, db };
