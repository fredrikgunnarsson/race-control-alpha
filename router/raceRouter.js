let express = require('express');
let router = express.Router();
let jwt = require('jsonwebtoken');
let path = require('path');

require('dotenv').config()
const SECRET = process.env.SECRET || '';
let {signToken,verifyToken} = require('../auth');

let User = require('../model/User');

async function protectedRoute (req,res,next) {
    let {user,pass} = verifyToken(req.cookies.race,SECRET);
    let users = await User.find({});
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

router.get('/', protectedRoute, (req,res) => {
    res.sendFile(path.resolve(__dirname, '..', 'views/shortcuts.html'))
})
router.get('/flag', protectedRoute, (req,res) => {
    res.sendFile(path.resolve(__dirname, '..', 'views/flag.html'))
})
router.get('/login', (req,res) => {
    res.sendFile(path.resolve(__dirname, '..', 'views/login.html'))
})
router.get('/section/:id', protectedRoute, (req,res)=>{
    res.sendFile(path.resolve(__dirname, '..', 'views/flag.html'))
})
router.get('/kontroll', protectedRoute, (req,res)=>{
    res.sendFile(path.resolve(__dirname, '..', 'views/kontroll.html'))
})
router.post('/auth', async (req,res) => {
    let {pass,user} = req.body;
    let users = await User.find({});
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
})
router.get('/test', (req,res)=> {
    res.send('test');
})

module.exports = router;