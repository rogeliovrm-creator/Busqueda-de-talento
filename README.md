# NBG Talent Outreach v8 (Firebase + GitHub + Vercel)

**Comienza por `CONFIGURACION.md`.**

Archivos principales:

- `index.html`: página de prospección, plantillas y casting.
- `firebase-config.js`: aquí se pega la configuración de TU proyecto Firebase.
- `firebase-sync.js`: inicio de sesión con Google y sincronización Firestore.
- `firebase.json`: alternativa para Firebase Hosting gratuito.
- `firestore.rules`: reglas para que solo los correos autorizados puedan acceder a los candidatos y capturas.

Se puede usar localmente, pero **la sincronización no funciona hasta configurar Firebase**. No subas datos personales de los candidatos al repositorio GitHub: se guardarán en Firestore.
