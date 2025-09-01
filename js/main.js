import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
// Para la autenticación
import {
  getAuth,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
// Para la mensajería (Cloud Messaging)
import { getMessaging, getToken} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";
import { getFirestore, doc, setDoc, collection, addDoc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {getFunctions, httpsCallable} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js"
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
const auth = getAuth(app);
const messaging = getMessaging(app);
const db = getFirestore(app)
const functions = getFunctions(app)

const defaultTasks = [
    { nombre: "Configurar perfil", completada: false },
    { nombre: "Explorar la aplicación", completada: false },
    { nombre: "Invitar a un amigo", completada: false },
    { nombre: "Completar tutorial", completada: false }
]

const signInButton = document.getElementById("sign-in-btn");
const signOutButton = document.getElementById("sign-out");
const subscribeButton = document.getElementById("suscribe");
const sendNotificationBtn = document.getElementById("send-notification-btn");
const userDisplay = document.getElementById("user-display")
const tasksList = document.getElementById("tasks-list")

if (signInButton) {
    signInButton.addEventListener('click', signIn);
} else {
    console.error("El botón con ID 'sign-in-btn' no fue encontrado.");
}

auth.onAuthStateChanged(async (user)=>{
    if(user){
        console.log("Usuario logueado", user.uid);
        userDisplay.textContent = user.displayName;
        await saveUserProfileToFirestore(user);
        renderTasks();
        susbscribeToNotifications()


        if(sendNotificationBtn){
            sendNotificationBtn.addEventListener('click',handleSendNotification);
        }
    }else{
        userDisplay.textContent = "Invitado";
        tasksList.innerHTML = ''
    }
})

function signIn() {
  signInWithPopup(auth, new GoogleAuthProvider())
    .then((result) => {
      console.log("Usuario autenticado", result.user.displayName);
    })
    .catch((error) => {
      console.log("Error", error);
    });
}

async function saveUserProfileToFirestore(user, fcmToken){
    try{
        const userRef = doc(db, "Usuarios", user.uid);
        const userDoc = await getDoc(userRef);
        await setDoc(userRef,{
            uid: user.uid,
            nombre: user.displayName || 'N/A',
            email: user.email,
            fcmToken: fcmToken
        }, {merge: true})
        console.log("Perfil de usuario guardado/actualizado en Firestore:", user.uid);
        if(!userDoc.exists()){
            console.log("Nuevo usuario detectado");
            const tareasCollectionRef = collection(db,"Usuarios",user.uid, "tareas");
            for (const task of defaultTasks) {
                await addDoc(tareasCollectionRef, {
                    nombre: task.nombre,
                    completada: task.completada,
                });
            }
            console.log("Tareas predeterminadas asignadas.");
        }
    }catch(firestoreError){
        console.error("Error al guardar perfil", firestoreError);
    }
}

async function renderTasks(){
    tasksList.innerHTML = '';
    const user = auth.currentUser;
    if(user){
        try{
            const tareasCollectionRef = collection(db, "Usuarios", user.uid, "tareas");
            const querySnapshot = await getDocs(tareasCollectionRef);

            querySnapshot.forEach((doc)=>{
                const tarea = {id: doc.id, ...doc.data()};
                const li = document.createElement('li');
                li.textContent = tarea.nombre;
                if (tarea.completada) {
                    li.style.textDecoration = 'line-through';
                }
                const completeBtn = document.createElement('button');
                completeBtn.textContent = tarea.completada ? 'Deshacer' : 'Completar';
                completeBtn.addEventListener('click', async () => {
                    await toggleTaskCompleted(user.uid, tarea.id, !tarea.completada);
                });
                li.appendChild(completeBtn);
                tasksList.appendChild(li);
            })
        }catch(error){
            console.error("Error en tareas", error)
        }
    }
}

async function toggleTaskCompleted(userId, taskId, isCompleted) {
    try {
        const taskRef = doc(db, "Usuarios", userId, "tareas", taskId);
        await setDoc(taskRef, { completada: isCompleted }, { merge: true });
        console.log(`Tarea ${taskId} marcada como ${isCompleted ? 'completada' : 'incompleta'}`);
        renderTasks(); // Volver a renderizar la lista
    } catch (error) {
        console.error("Error al actualizar tarea:", error);
    }
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
            const vapidKey = "BHqW4J1W-kVfZ5txCWbSG37tNJbcCIbV3oEpbjxPfo0XALPHD3r7Y6SWMQlaKxiORSu-YEqFVKmxo2buKom_u1s"
            const currentToken = await getToken(messaging, {vapidKey: vapidKey});
            if (currentToken){
                console.log('Token de registro FCM exitoso');
                const user = auth.currentUser;
                    if (user) {
                        await setDoc(doc(db, "Usuarios",user.uid), {
                            fcmToken: currentToken
                        }, {merge: true});
                    }
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

//para mandar notificaciones


async function handleSendNotification() {
    const user = auth.currentUser;
    const idToken = await user.getIdToken();
    if(!user){
        alert("Debes iniciar sesión");
        return;
    }
    console.log("🚀 Botón clicado, intentando enviar notificación...");

    const title = document.getElementById('notification-title').value;
    const body = document.getElementById('notification-body').value;

    if (!title || !body) {
        alert('Por favor, ingresa un título y un cuerpo para la notificación.');
        return;
    }

    try {
        const result = await fetch('https://us-central1-prueba-noti-2db31.cloudfunctions.net/sendNotifications',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + idToken
            },
            body: JSON.stringify({title,body})
        });
        const data = await result.json();
        console.log("Respuesta del servidor:", data);
        alert('Notificación enviada con éxito.');
    } catch (error) {
        console.error("Error al enviar la notificación:", error);
        alert('Error al enviar la notificación. Revisa la consola.');
    }
}
