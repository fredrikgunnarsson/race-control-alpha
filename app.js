let express = require('express');
let app = express();
let http = require('http').createServer(app);
let io = require('socket.io')(http);

app.use('/', express.static('public'))

// app.get('/', (req,res)=>{
//     res.sendFile(__dirname+ '/index.html')
// })

const flagsSchema = [
    {
        name:'flag-finish', 
        needNumber:false, 
        canBlink:false, 
        prio:2,
        save:false, 
        pause:false, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-yellow-red', 
        needNumber:false, 
        canBlink:false, 
        prio:5, 
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-green', 
        needNumber:false, 
        canBlink:false, 
        prio:6,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-white', 
        needNumber:false, 
        canBlink:true, 
        prio:4,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-yellow', 
        needNumber:false, 
        canBlink:true, 
        prio:3, 
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-red', 
        needNumber:false, 
        canBlink:true, 
        prio:1, 
        save:false, 
        pause:false, 
        allScreen:true, 
        isSignal:true,
    },
    {
        name:'flag-black', 
        needNumber:true, 
        canBlink:false, 
        prio:10,
        save:true, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-black-white', 
        needNumber:true, 
        canBlink:false, 
        prio:10,
        save:true, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-black-orange', 
        needNumber:true, 
        canBlink:false, 
        prio:10,
        save:true, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-blue', 
        needNumber:false, 
        canBlink:false, 
        prio:10,
        save:false, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-sc', 
        needNumber:false, 
        canBlink:true, 
        prio:3,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-vsc', 
        needNumber:false, 
        canBlink:true, 
        prio:3,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
]

let PORT = process.env.PORT || 3009;
let flags = []
let screens = [];
let screens2 = [
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
    shiftTime:1000,
    blinkTime:500,
}

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
    res.send(JSON.stringify(screens2, null, 4));
})

io.on('connection', socket => {
    console.log(new Date,`server connection initiated... id: ${socket.id}`)
    screens.push({id:socket.id})
    io.emit('checkClientScreen')
    updateClient();

    socket.on('disconnect',()=>{
        console.log(new Date, `server connection disconnected... id: ${socket.id}`)
        let idx = screens.findIndex(el => el.id==socket.id)
        screens.splice(idx,1)

        screens2.forEach(el=>{
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
    socket.on('clientScreenInfo',({id,screen})=>{
        let idx = screens.findIndex(el => el.id==id)
        screens[idx] = screen
        updateClient()
    })
    // socket.on('selectFlag',(clickedFlag)=>{
    //     let idx = flags.findIndex(el => el.flag==clickedFlag);
    //     if (idx > -1) {
    //         flags.splice(idx,1)
    //     } else {
    //         flags.push({flag:clickedFlag, number:null});
    //     }
    //     updateClient();
    // })
    socket.on('selectFlag2',({clickedFlag,blink,number})=>{
        let flagAttributes = flagsSchema.find(flag => flag.name==clickedFlag);
        let selectedScreen = screens2.find(el=>el.active);

        if (!selectedScreen) {
            showToast('Ingen sektion vald. Klicka på en sektion','orange');
            return null;
        }

        
        if (flagAttributes.allScreen) {
            if (!isFlagSelected()) {
                screens2
                .filter(screen => screen.clients.length > 0)
                .forEach(screen => screen.flags=[{name:clickedFlag,blink:blink,number:number}]);
            } else {
                screens2
                .filter(screen => screen.clients.length > 0)
                .forEach(screen => screen.flags=[]);
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
            return (selectedScreen.flags.findIndex(flag=>flag.name == clickedFlag) < 0) ? false : true;
        }
        function toggleFlagSelection() {
            let flagArrayIndex= selectedScreen.flags.findIndex(flag=>flag.name == clickedFlag);

            if (isFlagSelected()) {
                selectedScreen.flags.splice(flagArrayIndex,1)
            } else {
                selectedScreen.flags.push({name:clickedFlag,blink:blink,number:number});
            }
        }
        updateClient();
    })
    // socket.on('selectNumber',({flag, number})=>{
    //     console.log(flag, number)
    //     let idx = flags.findIndex(el => el.flag==flag)
    //     flags[idx].number=number;
    //     updateClient();
    // })

    socket.on('sectionUpdate',({section})=>{
        let idx = screens2.findIndex(el=>el.section==section);
        if (idx>-1) screens2[idx].clients.push(socket.id);
        showToast(`ny skärm (sektion: ${section})`)
    })
    socket.on('clickSection',({section})=>{
        let clickedSection = screens2.filter(el=>el.section==section)[0]
        let activeSections = screens2.filter(el=>el.active);
        let isActive = clickedSection.active
        let isOnline = (clickedSection.clients.length > 0) ? true : false;

        if (isOnline) {
            activeSections.forEach(el => el.active=false)
            clickedSection.active ^= true
        } else {
            showToast(`Ingen skärm uppkopplad för sektion ${clickedSection.section}`,'orange')
        }
        // console.log(section, ` isActive:${isActive}  isOnline:${isOnline}... ${JSON.stringify(clickedSection)}`)
        updateClient()
    })

    // socket.on('selectScreenRole', ({id,role})=>{
    //     console.log(role);
        
    //     let idx = screens.findIndex(el => el.id==id);
    //     screens[idx].role=role
    //     updateClient()
    // })
})

function updateClient() {
    io.emit('updateClient',{screens,flags, screens2})
}
function showToast(msg, color) {
    io.emit('showToast',{msg, color})
}

setInterval(() => {
    console.log('...');
}, 1000);


http.listen(PORT, ()=>{
    console.log(`listening on port... ${PORT}`)
});

