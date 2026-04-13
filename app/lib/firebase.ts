// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwudDiBOdnBrVE8TOMXn_l4lPC-fFudd0",
  authDomain: "uibac-quiz.firebaseapp.com",
  projectId: "uibac-quiz",
  storageBucket: "uibac-quiz.firebasestorage.app",
  messagingSenderId: "595832566144",
  appId: "1:595832566144:web:876e214229ee504d2ad165",
  measurementId: "G-ZZL2PV2DCP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let analytics: any = null;

// Initialize Analytics safely on client side
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, db, analytics, auth };
