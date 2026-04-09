// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { useEffect } from "react";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);

