/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true }); // Permite cualquier origen, puedes restringir a tu dominio

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.sendNotificationsTry = functions.https.onRequest((req, res) => {
    console.log("sendNotifications llamada (antes de CORS)"); // ✅ Primer log

    // Manejo de CORS
    cors(req, res, () => {
        console.log("Dentro del callback de CORS"); // ✅ Segundo log

        // Revisar método HTTP
        if (req.method === 'OPTIONS') {
            console.log("Preflight OPTIONS recibido");
            return res.status(204).send('');
        }

        if (req.method !== 'POST') {
            console.log("Método no permitido:", req.method);
            return res.status(405).send('Método no permitido');
        }

        try {
            // Revisar headers
            const authHeader = req.headers.authorization;
            console.log("Header de autorización recibido:", authHeader);

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.log("Token de autorización no proporcionado o incorrecto");
                return res.status(401).send({ error: 'No se proporcionó token de autenticación' });
            }

            // Decodificar token (simulado para prueba)
            const idToken = authHeader.split('Bearer ')[1];
            // En esta versión mínima no se verifica realmente, solo log
            console.log('Token recibido para verificación:', idToken);

            // Respuesta de prueba
            res.send({ message: 'Función sendNotifications ejecutada correctamente' });
        } catch (error) {
            console.error('Error en la función:', error);
            return res.status(500).send({ error: error.message || 'Error desconocido' });
        }
    });
});

exports.sendNotifications = functions.https.onRequest((req, res) => {
    console.log("sendNotifications llamada antes de CORS");
    cors(req, res, async () => { // Manejo de CORS
        console.log("sendNotifications llamada");
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');


        if(req.method === 'OPTIONS'){
             console.log("Preflight OPTIONS recibido");
            return res.status(204).send('');
        }

        if (req.method !== 'POST') {
            console.log("Método no permitido:", req.method);
            return res.status(405).send('Método no permitido');
        }

        try {
            // Verificar token
            const authHeader = req.headers.authorization;
            console.log("Header de autorización recibido:", authHeader);
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).send({ error: 'No se proporcionó token de autenticación' });
            }

            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log('Usuario autenticado:', decodedToken.uid);

            // Datos de la notificación
            const { title, body } = req.body;
            if (!title || !body) {
                return res.status(400).send({ error: 'Título y cuerpo son requeridos' });
            }

            const notificationRef = admin.firestore().collection('Notificacitions');
            await notificationRef.add({
                title,
                body,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                sentBy: decodedToken.uid
            })

            // Tokens FCM
            const usersRef = admin.firestore().collection('Usuarios');
            const snapshot = await usersRef.get();
            const tokens = [];
            snapshot.forEach(doc => {
                const user = doc.data();
                if (user.fcmToken && typeof user.fcmToken === 'string') tokens.push(user.fcmToken);
            });
            console.log("Tokens", tokens)
            if (tokens.length === 0) return res.send({ message: 'No se encontraron tokens.' });

           /* const payload = { registration_ids: tokens,
                 notification: { title, body } };
            */
            let successCount = 0;
            const response = await admin.messaging().sendEachForMulticast({
                tokens: tokens,
                notification: {title, body}
            });

            response.results.forEach((result,index) => {
                if(result.error){
                    console.error(`Error con el token ${tokens[index]}:`, result.error);
                }else{
                    successCount++;
                }
            })

            return res.send({ message: `Notificación enviada a ${successCount} dispositivos.` });

        } catch (error) {
            console.error('Error enviando notificación:', error);
            return res.status(500).send({ error: error.message || 'Ocurrió un error al enviar la notificación.' });
        }
    });
});