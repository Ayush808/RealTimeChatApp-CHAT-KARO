const socket = io();

// Elemets
const $messageForm = document.querySelector('#form-submit');
const $messageFormMessage = $messageForm.querySelector('#msg');
const $messageFormButton = $messageForm.querySelector('button');
const $locationButton = document.querySelector('#send-location');

// for message to dynamic add to mustache templete
const $messages = document.querySelector('#messages');
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true});

//Enable Auto-scrolling 
const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('sendToAll', (msg)=>{
    console.log(':) ', msg);
    const html = Mustache.render(messageTemplate, {
        username : msg.username,
        msg : msg.text,
        createdAt: moment(msg.createdAt).format('hh:mm:a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
});


socket.on('locationMessage', (msg)=>{
    console.log(msg);
    const html = Mustache.render(locationMessageTemplate, {
        username : msg.username,
        url : msg.url,
        createdAt: moment(msg.createdAt).format('hh:mm:a')
    })
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll()
});

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

document.querySelector('#form-submit').addEventListener('submit',(e)=>{
    e.preventDefault();

    // disable the button till the location / message send to others so that to avoid redundency
    $messageFormButton.setAttribute('disabled', 'disabled')

    // var message = document.querySelector('#msg').value;
    var message = e.target.elements.message.value;

    socket.emit('sendData',message, (err)=>{
        $messageFormButton.removeAttribute('disabled');
        $messageFormMessage.value='';
        $messageFormMessage.focus();
        if(err){
            return console.log(err);
        }
        console.log('The message was Delivered');
    });
})


document.querySelector('#send-location').addEventListener('click', ()=>{
    $locationButton.setAttribute('disabled', 'disabled');
    if(!navigator.geolocation){
        return alert('GeoLocation Not supported by your Browser...!')
    }
    navigator.geolocation.getCurrentPosition((position)=>{ 
       // console.log(position);
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        },()=>{
            console.log('Location Shared :)');
            $locationButton.removeAttribute('disabled');
        })
    })
})

socket.emit('join', {username, room}, (error)=>{
    if(error){
        alert(error)
        location.href='/';
    }
});