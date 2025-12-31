import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAxW3KzbHcFx7XhsILXPkl3fagnP8HkzFU",
        authDomain: "r3xsaler-project-v1.firebaseapp.com",
            projectId: "r3xsaler-project-v1",
                storageBucket: "r3xsaler-project-v1.firebasestorage.app",
                    messagingSenderId: "959213104686",
                        appId: "1:959213104686:web:5e5a33b1a32dd99590f9bf"
                        };

                        const app = initializeApp(firebaseConfig);
                        export const auth = getAuth(app);
                        export const db = getFirestore(app);
                        export const appId = "1:959213104686:web:5e5a33b1a32dd99590f9bf";
                        