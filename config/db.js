const mongoose = require('mongoose')
mongoose.Promise = global.Promise

mongoose.connect(`mongodb://localhost:27018/`, { useNewUrlParser: true, useUnifiedTopology: true })

mongoose.connection
    .once('open', () => console.log('Connected to the database'))
    .on('error', err => console.error(err))   