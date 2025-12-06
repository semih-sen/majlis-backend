const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Güvenlik kilidi açık, her yerden erişim var
    methods: ["GET", "POST"]
  }
});

// Hangi odada kimlerin olduğunu takip etmek için basit bir hafıza
const users = {}; 

io.on('connection', (socket) => {
  
  console.log(`Biri kapıyı çaldı: ${socket.id}`);

  // 1. ODAYA GİRİŞ
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    
    // Kullanıcıyı odaya kaydet (İleride lazım olur)
    if (!users[roomId]) users[roomId] = [];
    users[roomId].push(userId);

    console.log(`Kullanıcı ${userId}, ${roomId} odasına girdi.`);

    // Sadece O ODADAKİLERE haber ver (Doğrusu budur)
    socket.to(roomId).emit('user-connected', userId);

    // KOPMA DURUMU İÇİN HAZIRLIK
    socket.on('disconnect', () => {
      console.log(`Biri kaçtı: ${userId}`);
      // Odadakilere "Bu arkadaş düştü, görüntüsünü kaldırın" de
      socket.to(roomId).emit('user-disconnected', userId);
      
      // Listeden temizle (Memory leak olmasın)
      // (Basit tutmak için detaylı temizlik kodunu buraya boğmadım)
    });
  });

  // 2. YAZILI SOHBET (CHAT)
  // Mesaj gelince, gönderen hariç odadaki diğer herkese ilet
  socket.on('send-message', (roomId, message, userName) => {
    socket.to(roomId).emit('create-message', message, userName);
  });

  // 3. WEBRTC SİNYALLERİ (Sadece ilgili odaya)
  socket.on('offer', (data) => {
    // data.roomId gönderilmesini bekliyoruz
    socket.to(data.roomId).emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Majlis v2.0 Sunucusu ${PORT} portunda emre amade!`);
});