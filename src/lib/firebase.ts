// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "courseflow-kanban",
  "appId": "1:938316218760:web:b141c374690b1af664fa3d",
  "storageBucket": "courseflow-kanban.firebasestorage.app",
  "apiKey": "AIzaSyAYSJyLOErkHtx8ingh-ZbA_Ts6WJzcJlc",
  "authDomain": "courseflow-kanban.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "938316218760"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
