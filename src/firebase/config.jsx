import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8Rje3DXDwsPMlYj8wiXrlU2y5dJVcims",
  authDomain: "zyborn-auction-3c34d.firebaseapp.com",
  projectId: "zyborn-auction-3c34d",
  storageBucket: "zyborn-auction-3c34d.firebasestorage.app",
  messagingSenderId: "315558979600",
  appId: "1:315558979600:web:4ae0cf5a7a2d267a5b4295"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
