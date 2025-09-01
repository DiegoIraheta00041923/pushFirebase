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


exports.sendNotification = functions.https.onCall(async (data, context) => {
    console.log("UID del usuario:", context.auth.uid);

   
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Solo usuarios autenticados pueden enviar notificaciones.');
    }

    
    const { title, body } = data;

    if (!title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'El título y el cuerpo del mensaje son requeridos.');
    }

    try {
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
            return { message: 'No se encontraron tokens.' };
        }

        const payload = {
            notification: {
                title: title,
                body: body
            }
        };

        const response = await admin.messaging().sendToDevice(tokens, payload);
        console.log('Notificación enviada con éxito:', response.successCount, 'mensajes.');

        return { message: `Notificación enviada con éxito a ${response.successCount} dispositivos.` };

    } catch (error) {
        console.error('Error al enviar la notificación:', error);
        throw new functions.https.HttpsError('internal', 'Ocurrió un error al enviar la notificación.');
    }
});