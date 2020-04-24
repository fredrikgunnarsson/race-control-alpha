let express = require('express');
let app = express();
let cookieParser = require('cookie-parser');
let http = require('http').createServer(app);
let io = require('socket.io')(http);

let mongoose = require('mongoose');
let fs = require('fs');
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

//DB CONNECT
mongoose.connect(DBCONNECTION,{useNewUrlParser:true,useUnifiedTopology: true},()=>
    console.log('connected to db')
);

// const post = new Flag({
//     name: 'flag-vsc',
//     needNumber: false,
//     canBlink: true,
//     prio: 3,
//     canSave: false,
//     pause: true,
//     allScreen: false,
//     isSignal: true
// })
// post.save().then(res=>console.log(res))



// const post = new Config({
//     shiftTime: 700,
//     blinkTime: 350,
//     numberOfScreens:12
// })
// post.save().then(res=>console.log(res))

// const post = new User({
//     name: 'admin',
//     pass: 'admin',
// })
// post.save().then(res=>console.log(res))

// User.find({}).then(res=>console.log(res))
// Flag.deleteMany({}).then(data=>console.log(data));
// Flag.insertMany({}, (docs)=>console.log(docs))


// let config = {
//     shiftTime:1700,
//     blinkTime:500,
//     numberOfScreens:13,
// }






let config
let sections
let flagsModel
let users

(async () => {
    const configData = await Config.find({});
    config = configData[0];
    sections = createSections(config.numberOfScreens);

    const flagData = await Flag.find({});
    flagsModel = flagData.map(x=> ({
        name:x.name,
            needNumber:x.needNumber,
            canBlink:x.canBlink,
            prio:x.prio,
            canSave:x.canSave,
            pause:x.pause,
            allScreen:x.allScreen,
            isSignal:x.isSignal
    }));

    const userData = await User.find({});
    users = userData;

    startServer();
})()

// let getConfig = () => JSON.parse(fs.readFileSync('./model/Config.json'));
// let config = getConfig();
// let sections = [...Array(config.numberOfScreens)].map((el,i)=>{ 
//     return {
//     section:i,
//     clients:[],
//     flags:[],
//     active:false}
// })
// let users = JSON.parse(fs.readFileSync('./model/Users.json'));
// let flagsModel = JSON.parse(fs.readFileSync('./model/flags.json'));
// console.log(flagsModel)
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
            // } else if (number) {
            //     if (isFlagSelected().number != number) {
            //         showToast('Lägga till två nummer');
            //         addFlagToScreen();
            //     } else {
            //         removeScreenFlag();
            //     }
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
                // console.log(otherFlags);
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
        // let idx = sections.findIndex(el=>el.section==section);
        // if (idx>-1) sections[idx].clients.push(socket.id);

        let connectedSection = sections.find(el=>el.section==section);
        if(connectedSection) connectedSection.clients.push(socket.id);
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
        config.shiftTime = Number(ms);
        updateConfigFile(config)
        updateClient();
        // io.emit('changeCarouselSpeedServer',config.shiftTime);
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
        // io.emit('updateClientSections', sections)
        
        updateClient();
    }) 
    socket.on('changeFlagAttributes',(newFlagModel)=>{
        flagsModel = newFlagModel;
        Flag.deleteMany({}).then(data => {
            Flag.insertMany(flagsModel)
        });
        // fs.writeFileSync('./model/flags.json', JSON.stringify(newFlagModel))
    })

})
// HELPER FUNCTIONS

function updateClient() {
    // console.log(config)
    io.emit('updateClient',{sections, config})
}
function showToast(msg, color) {
    io.emit('showToast',{msg, color})
}
function updateConfigFile(config) {
    // Config.deleteMany({});
    Config.updateOne({},config).then(data => {})

    // fs.writeFileSync('./model/Config.json',JSON.stringify(config))
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
