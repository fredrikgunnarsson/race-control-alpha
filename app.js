let app = require('express')();
let http = require('http').createServer(app);
let io = require('socket.io')(http);

app.get('/', (req,res)=>{
    res.sendFile(__dirname+ '/index.html')
})

let PORT = process.env.PORT || 3009;
let flags = []
let screens = [];

io.on('connection', socket => {
    console.log(new Date,`server connection initiated... id: ${socket.id}`)
    screens.push({id:socket.id})
    io.emit('checkClientScreen')

    socket.on('disconnect',()=>{
        console.log(new Date, `server connection disconnected... id: ${socket.id}`)
        let idx = screens.findIndex(el => el.id==socket.id)
        screens.splice(idx,1)
        updateClient()
    })
    socket.on('clientScreenInfo',({id,screen})=>{
        let idx = screens.findIndex(el => el.id==id)
        screens[idx] = screen
        updateClient()
    })
    socket.on('selectFlag',(clickedFlag)=>{
        let idx = flags.findIndex(el => el.flag==clickedFlag);
        if (idx > -1) {
            flags.splice(idx,1)
        } else {
            flags.push({flag:clickedFlag, number:null});
        }
        updateClient();
    })
    socket.on('selectNumber',({flag, number})=>{
        console.log(flag, number)
        let idx = flags.findIndex(el => el.flag==flag)
        flags[idx].number=number;
        updateClient();
    })

    socket.on('selectScreenRole', ({id,role})=>{
        let idx = screens.findIndex(el => el.id==id);
        screens[idx].role=role
        updateClient()
    })
})

function updateClient() {
    io.emit('updateClient',{screens,flags})
}


http.listen(PORT, ()=>{
    console.log(`listening on port... ${PORT}`)
});

