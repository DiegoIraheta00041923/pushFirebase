import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";

// Para la autenticación
import {
  getAuth,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
// Para la base de datos en tiempo real
import {
  getDatabase,
  ref,
  set,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
// Para la mensajería (Cloud Messaging)
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIkCpPpVAiIWROK1s7I3dDjJkS3jEj1WI",

  authDomain: "prueba-noti-2db31.firebaseapp.com",

  databaseURL: "https://prueba-noti-2db31-default-rtdb.firebaseio.com",

  projectId: "prueba-noti-2db31",

  storageBucket: "prueba-noti-2db31.firebasestorage.app",

  messagingSenderId: "437866471554",

  appId: "1:437866471554:web:b04a9d04e9809009b3949b",

  measurementId: "G-X3EL2XX0QJ",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const messaging = getMessaging(app);


const signInButton = document.getElementById("sign-in-btn");
const signOutButton = document.getElementById("sign-out");
const subscribeButton = document.getElementById("suscribe");

if (signInButton) {
    signInButton.addEventListener('click', signIn);
} else {
    console.error("El botón con ID 'sign-in-btn' no fue encontrado.");
}

function signIn() {
  signInWithPopup(auth, new GoogleAuthProvider())
    .then((result) => {
      console.log("Usuario autenticado", result.user.displayName);
      susbscribeToNotifications()
    })
    .catch((error) => {
      console.log("Error", error);
    });
}

function handleSignout(){
    signOut(auth)
        .then(()=>{
            console.log("Usuario cerro sesión")
        })
        .catch((error)=>{
            console.error("Error",error)
        })
}

if (signOutButton) {
    signOutButton.addEventListener('click', handleSignout);
} else {
    console.error("El botón con ID 'sign-out' no fue encontrado.");
}

async function susbscribeToNotifications(){
    try{
        const permission = await Notification.requestPermission();

        if(permission === "granted"){
            console.log("permiso concedido");

            const messagingSenderId = firebaseConfig.messagingSenderId;
            const vapidKey = "BHqW4J1W-kVfZ5txCWbSG37tNJbcCIbV3oEpbjxPfo0XALPHD3r7Y6SWMQlaKxiORSu-YEqFVKmxo2buKom_u1s"

            const currentToken = await getToken(messaging, {vapidKey: vapidKey});

            if (currentToken){
                console.log('Token de registro FCM:', currentToken);

            }else{
                console.warn("No se pudo obtener el token")
            }
        }else{
            console.warn("Permiso denegado")
        }
    } catch(error){
        console.error('Error', error)
    }
}

if(subscribeButton){
    subscribeButton.addEventListener('click',susbscribeToNotifications)
}

