let express = require('express');
let app = express();
let cookieParser = require('cookie-parser');
let http = require('http').createServer(app);
let io = require('socket.io')(http);

let mongoose = require('mongoose');
let jwt = require('jsonwebtoken');

let Flag = require('./model/Flag');
let User = require('./model/User');
let Config = require('./model/Config')

let {signToken,verifyToken} = require('./auth');

app.use('/', express.static('public'))
app.use(express.json());
app.use(cookieParser())

require('dotenv').config()
let PORT = process.env.PORT || 3009;
const DBCONNECTION = process.env.DBCONNECTION || '';
const SECRET = process.env.SECRET || '';

mongoose.connect(DBCONNECTION,{useNewUrlParser:true,useUnifiedTopology: true},()=>
    console.log('connected to db')
);

let config, sections, flagsModel, users;

(async () => {
    const configData = await Config.find({});
    config = configData[0];
    sections = createSections(config.numberOfScreens);

    const flagData = await Flag.find({}).sort({prio: 1});
    flagsModel = flagData.map(flag=> ({
        name:flag.name,
        needNumber:flag.needNumber,
        canBlink:flag.canBlink,
        prio:flag.prio,
        canSave:flag.canSave,
        pause:flag.pause,
        allScreen:flag.allScreen,
        isSignal:flag.isSignal
    }));

    const userData = await User.find({});
    users = userData;

    startServer();
})()

let screens = [];

// MIDDLEWARE

function protectedRoute (req,res,next) {
    let {user,pass} = verifyToken(req.cookies.race,SECRET);
    let isUser = users.find(rec => rec.name == user);

    if (isUser && isUser.pass == pass) {
        console.log('Token verified (protectedRoute)');
        let token = jwt.sign({pass:pass, user:user},SECRET,{expiresIn:'1d'})
        res.cookie('race',token,{ maxAge: 1000*60*60*24*365});
        next();
    } else {
        console.log('Invalid token (protectedRoute)');
        res.status(401).send('Fel 401 - Du är ej inloggad, <a href="/login">Logga in här</a>');
        res.end();
    }
}

//ROUTES

app.get('/', protectedRoute, (req,res)=>{
    res.sendFile(__dirname + '/views/shortcuts.html')
})
app.get('/api/flags', protectedRoute ,(req,res)=>{
    res.json({flagsModel,sections})
});
app.get('/flag', protectedRoute ,(req,res) => {
    res.sendFile(__dirname + '/views/flag.html')
})
app.get('/login', (req,res) => {
    res.sendFile(__dirname + '/views/login.html')
})
app.get('/section/:id', protectedRoute, (req,res)=>{
    res.sendFile(__dirname + '/views/flag.html')
})
app.get('/kontroll', protectedRoute, (req,res)=>{
    res.sendFile(__dirname + '/views/kontroll.html')
})
app.get('/screens', protectedRoute,(req,res)=>{
    res.header("Content-Type",'application/json');
    res.send(JSON.stringify(sections, null, 4));
})
app.post('/auth', (req,res) => {
    let {pass,user} = req.body;
    let isUser = users.find(rec => rec.name == user);

    if (!isUser) {
        res.json({error:'Användare existerar inte'})
        return
    }
    if (isUser.pass != pass) {
        res.json({error:'Fel lösenord'})
        return
    }

    let token = jwt.sign({pass:pass, user:user},SECRET,{expiresIn:'1d'})
    
    res.cookie('race',token,{ maxAge: 1000*60*60*24*365});
    res.json({redirect:'/'})
});
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

    socket.on('selectFlag',({clickedFlag,blink,number})=>{
        let flagAttributes = flagsModel.find(flag => flag.name==clickedFlag);
        let selectedScreen = sections.find(el=>el.active);
        let allActiveScreens = sections.filter(screen => screen.clients.length > 0);
        let flagIndex = (selectedScreen) 
            ? selectedScreen.flags.findIndex(flag => (flag.name == clickedFlag && flag.number == number) ) 
            : undefined;

        if (!selectedScreen) {
            showToast('Ingen sektion vald. Klicka på en sektion','orange');
            return;
        }

        if (isFlagSelected()) {
            if (flagAttributes.allScreen) {
                if (blink && !isFlagSelected().blink) {
                    allActiveScreens.forEach(screen => screen.flags=[{name:clickedFlag,blink:blink,number:number}]);
                } else {
                    allActiveScreens.forEach(screen => screen.flags.length=0);
                }
            } else if (blink && !isFlagSelected().blink) {
                selectedScreen.flags[flagIndex].blink=true;
            } else if (flagAttributes.pause) {
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

        if (flagAttributes.allScreen) {
            allActiveScreens.forEach(screen => screen.flags=[{name:clickedFlag,blink:blink,number:number}]);
            updateClient()
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

function startServer() {
    http.listen(PORT, ()=>{
        console.log(`listening on port... ${PORT}`)
    });

    setInterval(() => {
        console.log('...');
    }, 3000);
}
