// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "TODO: Add your api key",
  authDomain: "TODO: Add your auth domain",
  projectId: "TODO: Add your project id",
  storageBucket: "TODO: Add your storage bucket",
  messagingSenderId: "TODO: Add your messaging sender id",
  appId: "TODO: Add your app id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
