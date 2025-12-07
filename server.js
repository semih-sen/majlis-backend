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

  // 1. ODAYA GİRİŞ (DÜZELTİLDİ)
  // Frontend: emit('join-room', roomId, username) gönderiyor.
  socket.on('join-room', (roomId, username) => {
    socket.join(roomId);
    
    // Güvenilir ID, Socket'in kendi ID'sidir. Onu kullanalım.
    const peerId = socket.id; 
    
    console.log(`Kullanıcı ${username} (${peerId}), ${roomId} odasına girdi.`);

    // --- KRİTİK DÜZELTME BURASI ---
    // Frontend bizden bir OBJE bekliyor: { peerId, username }
    // Eskiden sadece string gönderiyorduk, o yüzden undefined geliyordu.
    socket.to(roomId).emit('user-connected', { 
      peerId: peerId, 
      username: username 
    });

    socket.on('disconnect', () => {
      console.log(`Biri kaçtı: ${username} (${peerId})`);
      // Çıkarken de aynı paketi gönderelim ki kimin çıktığı belli olsun
      socket.to(roomId).emit('user-disconnected', { 
        peerId: peerId, 
        username: username 
      });
    });
  });

  // 2. YAZILI SOHBET
  socket.on('send-message', (roomId, message, senderId) => { // userName yerine senderId daha güvenli olabilir ama şimdilik kalsın
    socket.to(roomId).emit('create-message', message, senderId);
  });

  // 3. WEBRTC SİNYALLERİ (AKILLI SANTRAL)
  const signalHandler = (eventName, data) => {
    // SENARYO A: Hedef belliyse -> Direkt o kişiye
    if (data.targetId) {
      io.to(data.targetId).emit(eventName, data);
      console.log(`Özel Sinyal (${eventName}): ${socket.id} -> ${data.targetId}`);
    } 
    // SENARYO B: Hedef yoksa -> Odaya (Eski usul fallback)
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
  console.log(`Majlis v2.2 (JSON Paketli) ${PORT} portunda hazır!`);
});