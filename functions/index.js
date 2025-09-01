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

if (!admin.apps.length) {
  admin.initializeApp();
}


exports.sendNotifications = functions.https.onRequest(async (req, res) => {
    
   
    if (req.method != 'POST') {
        return res.status(405).send('Método no permitido');
    }

    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(401).send({ error: 'No se proporcionó token de autenticación' });
        }

        const idToken = authHeader.split('Bearer ')[1];

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('Usuario autenticado: ', decodedToken.uid);

        const {title, body} = req.body;
        if (!title || !body) {
            return res.status(400).send({ error: 'Título y cuerpo son requeridos' });
        }

        const usersRef = admin.firestore().collection('Usuarios');
        const snapshot = await usersRef.get();
        const tokens = [];

        snapshot.forEach(doc => {
            const user = doc.data();
            if (user.fcmToken && typeof user.fcmToken === 'string') {
                tokens.push(user.fcmToken);
            }
        });

        if (tokens.length === 0) {
            console.log('No se encontraron tokens para enviar notificaciones.');
            return res.send({ message: 'No se encontraron tokens.' });
        }

        const payload = {
            notification: { title, body }
        };

        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log('Notificación enviada con éxito:', response.successCount, 'mensajes.');

        return res.send({ message: `Notificación enviada a ${response.successCount} dispositivos.` });


    } catch (error) {
        console.error('Error al enviar la notificación:', error);
        throw new functions.https.HttpsError('internal', 'Ocurrió un error al enviar la notificación.');
    }
});