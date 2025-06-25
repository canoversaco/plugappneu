// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCsybUqeyNm02rou16fl1-xQemntcLksGM",
  authDomain: "projekt-b2443.firebaseapp.com",
  projectId: "projekt-b2443",
  storageBucket: "projekt-b2443.firebasestorage.app",
  messagingSenderId: "441242827806",
  appId: "1:441242827806:web:8f9d3c9cee8bb3d8ee420f",
  measurementId: "G-MXM0PMLQ5R",
});

const messaging = firebase.messaging();

// Background-Notification-Handler (optional)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

