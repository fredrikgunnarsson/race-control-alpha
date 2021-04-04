let express = require('express');
let app = express();
let cookieParser = require('cookie-parser');
let http = require('http').createServer(app);
let io = require('socket.io')(http);
let mongoose = require('mongoose');
require('dotenv').config()

let Flag = require('./model/Flag');
let Config = require('./model/Config')
let raceRouter = require('./router/raceRouter');

let PORT = process.env.PORT || 3009;
const DBCONNECTION = process.env.DBCONNECTION || '';

mongoose.connect(DBCONNECTION,{useNewUrlParser:true,useUnifiedTopology: true},()=>
    console.log('connected to db')
);

app.use(express.json());
app.use(cookieParser())
app.use('/', express.static('public'))
app.use('/', raceRouter);

let config, sections, flagsModel;

(async () => {
    const configData = await Config.findOne({});
    config = configData;
    sections = createSections(config.numberOfScreens);

    const flagData = await Flag.find({}).sort({sort: 1});
    flagsModel = flagData.map(flag=> ({
        name:flag.name,
        needNumber:flag.needNumber,
        canBlink:flag.canBlink,
        prio:flag.prio,
        canSave:flag.canSave,
        pause:flag.pause,
        allScreen:flag.allScreen,
        isSignal:flag.isSignal,
        sort:flag.sort
    }));

    startServer();
})()

let screens = [];
let start = {
    startIntro:false,
    start:false,
    startRolling:false,
    startAbort:false,
    closeStart:false,
    time:0,
    infoText:''
}

//ROUTES (rest of the routes are in the router)

app.get('/api/flags' ,(req,res)=>{
    res.json({flagsModel,sections})
});
app.get('/screens',(req,res)=>{
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(sections, null, 4));
})
app.get('*',(req,res) => {
    res.status(404).send('404 - den här sidan existerar inte')
})

//SOCKETS

io.on('connection', socket => {
    console.log(new Date,`server connection initiated... id: ${socket.id}`)
    screens.push({id:socket.id})
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

    socket.on('selectFlag',({clickedFlag,blink,number, allScreens, mainScreen})=>{
        let flagAttributes = flagsModel.find(flag => flag.name==clickedFlag);
        let selectedScreen = sections.find(el=>el.active);
        let allActiveScreens = sections.filter(screen => screen.clients.length > 0);

        if (mainScreen) selectedScreen = sections.find(el=>el.section==0);

        if (!flagAttributes.allScreen && !allScreens)  {
            handleSelectFlag(clickedFlag,blink,number,selectedScreen);
        } else {
            allActiveScreens.forEach((screen)=>{
                handleSelectFlag(clickedFlag,blink,number,screen);
            })
        }

        sections.forEach(el => el.active=false);
        updateClient()
    })

    socket.on('sectionUpdate',({section})=>{
        let connectedSection = sections.find(el=>el.section==section);
        if(connectedSection) connectedSection.clients.push(socket.id);
        showToast(`ny skärm (sektion: ${section})`);
        updateClient();
    })

    socket.on('clickSection',({section})=>{
        let clickedSection = sections.find(el=>el.section==section)
        let activeSections = sections.filter(el=>el.active);
        let isOnline = (clickedSection.clients.length > 0) ? true : false;

        if (!isOnline) {
            showToast(`Ingen skärm uppkopplad för sektion ${clickedSection.section}`,'orange')
            return;
        }

        activeSections.forEach(el => el.active=false)
        // can I remove ^ ?  maybe?!
        clickedSection.active = true;
        updateClient()
    })

    socket.on('changeCarouselSpeed',(ms)=>{
        config.shiftTime = Number(ms);
        updateConfigFile(config)
        updateClient();
    }) 

    socket.on('changeBlinkSpeed',(ms)=>{
        config.blinkTime = Number(ms);
        updateConfigFile(config)
        updateClient();
    }) 
    
    socket.on('changeNumberOfScreens',(num)=>{
        config.numberOfScreens = Number(num);
        updateConfigFile(config)

        if (num > 0 && num < sections.length) { 
            sections.length=num;
        } else {
            let i = sections.length;
            [...Array(num-sections.length)].forEach(el => {
                sections.push({section:i++,clients:[],flags:[],active:false})
            })
        }
        updateClient({changeNumberOfScreens:true});
    }) 
    socket.on('changeFlagAttributes',(newFlagModel)=>{
        flagsModel = newFlagModel;
        Flag.deleteMany({}).then(() => {
            Flag.insertMany(flagsModel)
        });
    })

    socket.on('clickStart', ({btn,text,time})=> {
        io.emit('clickStart', {btn:btn,text:text,time:time})
    })
})

// HELPER FUNCTIONS

function updateClient(options) {
    io.emit('updateClient',{sections, config, options})
}

function showToast(msg, color) {
    io.emit('showToast',{msg, color})
}

function updateConfigFile(config) {
    Config.updateOne({},config).then(data => {})
}

function createSections(num) {
    return [...Array(num)].map((el,i)=>{ 
        return {
        section:i,
        clients:[],
        flags:[],
        active:false}
    })
}

function handleSelectFlag(clickedFlag,blink,number,selectedScreen) {
    let flagAttributes = flagsModel.find(flag => flag.name==clickedFlag);
    let flagIndex = selectedScreen && selectedScreen.flags.findIndex(flag => {
        return (flag.name == clickedFlag && flag.number == number) 
    })

    if (!selectedScreen) {
        showToast('Ingen sektion vald. Klicka på en sektion','orange');
        return;
    }

    if (isFlagSelected()) {
        if (blink && !isFlagSelected().blink) {
            selectedScreen.flags[flagIndex].blink=true;
        } else if (flagAttributes.pause && selectedScreen.pausedFlags) {
            selectedScreen.flags = [...selectedScreen.pausedFlags]
        } else {
            removeScreenFlag()
        }
        updateClient()
        return;
    }

    if (flagAttributes.prio > getLowestPrio()) {
        showToast(`Flagga med prio ${getLowestPrio()} visas, släck den först`,'red')
        return;
    }

    if (flagAttributes.isSignal) {
        if(flagAttributes.pause) {
            let otherFlags = selectedScreen.flags.filter(flag => {
                return flagsModel.find(el => el.name == flag.name).canSave
            })
            selectedScreen.pausedFlags= [...otherFlags];
            if (otherFlags.length > 0) showToast(`Flaggor pausade`);
        }
        removeAllScreenFlags()
        addFlagToScreen()
        updateClient()
        return;
    }

    if (selectedScreen.flags.length > 1) {
        showToast('Max två flaggor tillåtna', 'red');
        return;
    }
    
    addFlagToScreen()
    updateClient()
    return;

    function removeAllScreenFlags() {
        selectedScreen.flags.length=0;
    }
    function addFlagToScreen() {
        selectedScreen.flags.push({name:clickedFlag,blink:blink,number:number});
    }
    function removeScreenFlag() {
        selectedScreen.flags.splice(flagIndex,1)
    }
    function isFlagSelected() { 
        return selectedScreen.flags.find(flag => (flag.name == clickedFlag && flag.number==number) );
    }
    function getLowestPrio() {
        let flagPrios =  selectedScreen.flags.map(flag => {
            return flagsModel.find(el => el.name==flag.name).prio
        })
        return Math.min(...flagPrios);
    }

}

function startServer() {
    http.listen(PORT, ()=>{
        console.log(`listening on port... ${PORT}`)
    });

    // setInterval(() => {
    //     console.log('...');
    // }, 3000);
}
