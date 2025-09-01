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

exports.sendNotifications = functions.https.onRequest((req, res) => {
    cors(req, res, async () => { // Manejo de CORS
        if (req.method !== 'POST') {
            return res.status(405).send('Método no permitido');
        }

        try {
            // Verificar token
            const authHeader = req.headers.authorization;
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

            if (tokens.length === 0) return res.send({ message: 'No se encontraron tokens.' });

            const payload = { notification: { title, body } };
            let successCount = 0;
            const response = await admin.messaging().sendToDevice(tokens, payload);
            response.results.forEach((result,index) => {
                if(result.error){
                    console.error(`Error con el token ${tokens[index]}:`, result.error);
                }else{
                    successCount++;
                }
            })
            console.log('Notificación enviada:', response.successCount);

            return res.send({ message: `Notificación enviada a ${response.successCount} dispositivos.` });

        } catch (error) {
            console.error('Error enviando notificación:', error);
            return res.status(500).send({ error: error.message || 'Ocurrió un error al enviar la notificación.' });
        }
    });
});