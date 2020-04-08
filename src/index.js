const express = require('express')
const app = express()
const path = require('path')
const http = require('http')
const server = http.createServer(app) // app ke liye server create karna hai
const Filter = require('bad-words')

const { generateMessage, generateLocationMessage, generateHistory } = require('./utils/messages.js')

const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users.js')
// include sockect.io library
const socketio = require('socket.io')
const io = socketio(server)      // by here our server supports web socket or socket.io

const port = process.env.PORT || 8000
const ip = require('ip')

const publicDirectoryPath = path.join(__dirname, '../public')

// to give a message that says client connect is via publish the message
var mongoclient = require('mongodb').MongoClient;

//Connect to Mongo
mongoclient.connect(process.env.MONGODB_URL || `mongodb://localhost:27018/`, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, db) {
    if (err) {
        throw err;
    }
    console.log('mongo connected')
    let dbo = db.db('chatroomdb')
    let chat = dbo.collection('chat')

    io.on('connection', (socket) => {

        console.log('New Web Socket Connection....')

        socket.on('join', (options, callback) => {

            const { error, user } = addUser({ id: socket.id, ...options })

            if (error) {
                return callback(error)
            }

            socket.join(user.room)
            socket.emit('sendToAll', generateMessage('Admin', 'Welcome!'))
            socket.broadcast.to(user.room).emit('sendToAll', generateMessage('Admin', `${user.username} has Joined...!`))

            chat.find({ room: user.room }).limit(100).sort({ _id: 1 }).toArray(function (err, res) {
                if (err) {
                    throw err
                }
                //Emmit the message
                if (res.length) {
                    for (let i = 0; i < res.length; i++) {
                        socket.emit('sendToAll', generateHistory(res[i]))
                    }
                }
            })

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })

            callback()
        })

        socket.on('sendData', (data, callback) => {

            const user = getUser(socket.id)

            var message = data
            const filter = new Filter()

            if (filter.isProfane(message)) {
                return callback('Profenity is Not Allowed')
            }

            chat.insertOne({ username: user.username, room: user.room, text: message, createdDate: new Date().getTime() }, function () {
                io.to(user.room).emit('sendToAll', generateMessage(user.username, message))
            })
            callback()
        })

        socket.on('sendLocation', (location, callback) => {
            const user = getUser(socket.id)
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
            callback()
        })

        socket.on('disconnect', () => {
            const user = removeUser(socket.id)
            if (user) {
                console.log(user, 'left')
                socket.broadcast.to(user.room).emit('sendToAll', generateMessage('Admin', `${user.username} has Left`))
                io.to(user.room).emit('roomData', {
                    room: user.room,
                    users: getUsersInRoom(user.room)
                })
            }
        })

    })

})

app.use(express.static(publicDirectoryPath))

server.listen(port, () => {
    console.log('application is running on http://' + ip.address() + ':' + port)
})