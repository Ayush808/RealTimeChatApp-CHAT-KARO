const path = require('path');
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app); // app ke liye server create karna hai
const Filter = require('bad-words');

const { generateMessage, generateLocationMessage } = require('./utils/messages.js');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users.js')
// include sockect.io library
const socketio = require('socket.io');
const io = socketio(server);      // by here our server supports web socket or socket.io

const port = process.env.PORT || 8000;
const ip = require('ip');

const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

// to give a message that says client connect is via publish the message
io.on('connection', (socket)=>{

    console.log('New Web Socket Connection....');

    socket.on('join', (options, callback) => {
    
        const {error, user} = addUser({id: socket.id, ...options})

        if(error){
            return callback(error);
        }
        
        socket.join(user.room);
        socket.emit('sendToAll', generateMessage('Admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('sendToAll', generateMessage('Admin', `${user.username} has Joined...!`));

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback();
    })

    socket.on('sendData',(data, callback) =>{

        const user = getUser(socket.id);

        var message = data;
        const filter = new Filter();

        if(filter.isProfane(message)){
            return callback('Profenity is Not Allowed')
        }
        io.to(user.room).emit('sendToAll', generateMessage(user.username, message));
        callback();
    })
    socket.on('sendLocation',(location, callback)=>{
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback();
    })

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id)
        if(user){
            socket.broadcast.to(user.room).emit('sendToAll', generateMessage('Admin' , `${user.username} has Left`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })

})

server.listen(port, ()=>{
    console.log('application is running on http://'+ip.address()+':'+port);
})