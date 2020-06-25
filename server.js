const express = require('express');
const http = require('http');
const path = require('path');
const colors = require('colors');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const bot = 'ChatCord Bot';
const {getCurrentUser, userJoin, userLeaves, getRoomUsers} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({extended: false}));

io.on('connection', socket => {
  socket.on('joinRoom', ({username, room}) => {

    const user = userJoin(socket.id, username, room);
    
    socket.join(user.room);
    
    socket.emit('message', formatMessage(bot, 'Welcome to the ChatCord!'));

    socket.broadcast.to(user.room).emit('message', formatMessage(bot, `${user.username} has joined the chat`));

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    
    io.to(user.room).emit('message', formatMessage(`${user.username}`, msg));
  });

  socket.on('disconnect', () => {
    const user = userLeaves(socket.id);

    if(user){
      io.to(user.room).emit('message', formatMessage(bot, `${user.username} has left the chat`));

      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

if(process.env.NODE_ENV === 'production'){
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`You are connected on port ${PORT}`.rainbow.underline);
});