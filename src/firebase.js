import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCl8isdMZb4fpBJ2V--lKSlk6mQTyxj5_c",
  authDomain: "attendance-76af4.firebaseapp.com",
  projectId: "attendance-76af4",
  storageBucket: "attendance-76af4.firebasestorage.app",
  messagingSenderId: "363313141369",
  appId: "1:363313141369:web:38ea1f026b84c6775a26a8",
  measurementId: "G-KWL3DWSHNJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
export default app;