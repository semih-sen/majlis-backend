const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  
  console.log(`Biri kapıyı çaldı: ${socket.id}`);

  // 1. ODAYA GİRİŞ
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    console.log(`Kullanıcı ${userId} (${socket.id}), ${roomId} odasına girdi.`);
    // Odadakilere haber ver
    socket.to(roomId).emit('user-connected', userId);

    socket.on('disconnect', () => {
      console.log(`Biri kaçtı: ${userId}`);
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  // 2. YAZILI SOHBET
  socket.on('send-message', (roomId, message, userName) => {
    socket.to(roomId).emit('create-message', message, userName);
  });

  // 3. WEBRTC SİNYALLERİ (AKILLI SANTRAL GÜNCELLEMESİ)
  // Offer, Answer ve Ice-Candidate olaylarını tek tek yazmak yerine
  // Ortak bir mantıkla "Hedef varsa hedefe, yoksa odaya" gönderelim.

  const signalHandler = (eventName, data) => {
    // SENARYO A: Hedef belliyse (Targeted) -> Direkt o kişiye gönder (Renegotiation için şart)
    if (data.targetId) {
      io.to(data.targetId).emit(eventName, data);
      console.log(`Özel Sinyal (${eventName}): ${socket.id} -> ${data.targetId}`);
    } 
    // SENARYO B: Hedef yoksa ama oda varsa (Broadcast) -> Odaya yay
    else if (data.roomId) {
      socket.to(data.roomId).emit(eventName, data);
      console.log(`Genel Sinyal (${eventName}): ${data.roomId} odasına.`);
    }
  };

  socket.on('offer', (data) => signalHandler('offer', data));
  socket.on('answer', (data) => signalHandler('answer', data));
  socket.on('ice-candidate', (data) => signalHandler('ice-candidate', data));

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Majlis v2.1 (Akıllı Santral) ${PORT} portunda hazır!`);
});