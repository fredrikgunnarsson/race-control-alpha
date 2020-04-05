let express = require('express');
let app = express();
let http = require('http').createServer(app);
let io = require('socket.io')(http);

app.use('/', express.static('public'))

const {flagsSchema} = require('./model/flagsSchema');

let PORT = process.env.PORT || 3009;
let screens = [];
let sections = [
    {
        section:0,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:1,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:2,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:3,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:4,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:5,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:6,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:7,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:8,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:9,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:10,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:11,
        clients:[],
        flags:[],
        active:false,
    },
    {
        section:12,
        clients:[],
        flags:[],
        active:false,
    },
];
let config = {
    shiftTime:1700,
    blinkTime:500,
}

//ROUTES

app.get('/api/flags',(req,res,next)=>{
    res.json(flagsSchema)
});
app.get('/flag',(req,res) => {
    res.sendFile(__dirname + '/public/flag.html')
})
app.get('/section/:id',(req,res)=>{
    res.sendFile(__dirname + '/public/flag.html')
})
app.get('/kontroll',(req,res)=>{
    res.sendFile(__dirname + '/public/kontroll.html')
})
app.get('/screens',(req,res)=>{
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(sections, null, 4));
})

//SOCKETS

io.on('connection', socket => {
    console.log(new Date,`server connection initiated... id: ${socket.id}`)
    screens.push({id:socket.id})
    io.emit('checkClientScreen')
    updateClient();

    socket.on('disconnect',()=>{
        console.log(new Date, `server connection disconnected... id: ${socket.id}`)
        let idx = screens.findIndex(el => el.id==socket.id)
        screens.splice(idx,1)

        sections.forEach(el=>{
            let idx = el.clients.indexOf(socket.id);
            if (idx > -1) {
                el.clients.splice(idx,1);
                showToast(`Skärm bortkopplad (sektion: ${el.section})`,'red');
                if (el.clients.length==0) {
                    showToast(`alla skärmar för sektion ${el.section} bortkopplade`,'red');
                    el.active=false;
                    el.flags=[]
                }
            }
        })

        updateClient()
    })

    socket.on('selectFlag',({clickedFlag,blink,number})=>{
        let flagAttributes = flagsSchema.find(flag => flag.name==clickedFlag);
        let selectedScreen = sections.find(el=>el.active);

        if (!selectedScreen) {
            showToast('Ingen sektion vald. Klicka på en sektion','orange');
            return null;
        }
        
        if (flagAttributes.allScreen) {
            let allScreensWithFlags = sections.filter(screen => screen.clients.length > 0);

            if (!isFlagSelected()) {
                allScreensWithFlags.forEach(screen => screen.flags=[{name:clickedFlag,blink:blink,number:number}]);
            } else {
                allScreensWithFlags.forEach(screen => screen.flags=[]);
            }
        }
        else if (selectedScreen.flags.length > 1) {
            if (isFlagSelected() || flagAttributes.pause) {
                toggleFlagSelection()
            } else {
                showToast('Max två flaggor tillåtna', 'red');
                return null;
            } 
        } else {
            toggleFlagSelection();
        }

        function isFlagSelected() { 
            // return (selectedScreen.flags.findIndex(flag=>flag.name == clickedFlag) < 0) ? false : true;
            return selectedScreen.flags.find(flag=>flag.name == clickedFlag);
        }
        
        function toggleFlagSelection() {
            let flagArrayIndex= selectedScreen.flags.findIndex(flag=>flag.name == clickedFlag);

            if (isFlagSelected()) {
                //Make it blink instead of removing the flag if blinkbtn is pressed
                if (blink && !isFlagSelected().blink) {
                    selectedScreen.flags[flagArrayIndex].blink=true;
                } else {
                    selectedScreen.flags.splice(flagArrayIndex,1)
                }
            } else if (flagAttributes.pause) {
                // console.log(selectedScreen.flags, flagAttributes.pause)
                selectedScreen.flags.length=0;
                selectedScreen.flags.push({name:clickedFlag,blink:blink,number:number});
            } else {
                selectedScreen.flags.push({name:clickedFlag,blink:blink,number:number});
            }
        }
        updateClient();
    })

    socket.on('sectionUpdate',({section})=>{
        let idx = sections.findIndex(el=>el.section==section);
        if (idx>-1) sections[idx].clients.push(socket.id);
        showToast(`ny skärm (sektion: ${section})`);
        updateClient();
    })

    socket.on('clickSection',({section})=>{
        let clickedSection = sections.filter(el=>el.section==section)[0]
        let activeSections = sections.filter(el=>el.active);
        let isActive = clickedSection.active
        let isOnline = (clickedSection.clients.length > 0) ? true : false;

        if (isOnline) {
            activeSections.forEach(el => el.active=false)
            clickedSection.active ^= true
        } else {
            showToast(`Ingen skärm uppkopplad för sektion ${clickedSection.section}`,'orange')
        }
        updateClient()
    })

    socket.on('changeCarouselSpeed',(ms)=>{
        config.shiftTime = ms;
        updateClient();
        // io.emit('changeCarouselSpeedServer',config.shiftTime);
    }) 
    socket.on('changeBlinkSpeed',(ms)=>{
        config.blinkTime = ms;
        updateClient();
        // io.emit('changeCarouselSpeedServer',config.shiftTime);
    }) 

})

// HELPER FUNCTIONS

function updateClient() {
    io.emit('updateClient',{sections, config})
}
function showToast(msg, color) {
    io.emit('showToast',{msg, color})
}

setInterval(() => {
    console.log('...');
}, 3000);


http.listen(PORT, ()=>{
    console.log(`listening on port... ${PORT}`)
});

