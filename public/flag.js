// ===============================
// INITIALIZATIONS
// ===============================

let socket=io();

let flagsSchema = [{}];

(function getFlags() {
    return fetch('/api/flags')
    .then(res => res.json())
    .then(data => {
        flagsSchema = data;
        startFlagCarousel();
    })
})()

let section = document.location.pathname.match(/\/section\/(\d{1,2})/)[1]

let clientScreen = {
    role:'flag',
    section:section,
    flags:[],
}

let serverState=[];
let flagNumber='';
let carouselCounter = 0;
let carouselMs = 1700;
let blinkTime=500;
let isAbortStart=false;

const screenNameElement = document.querySelector('#screen-name');
const flagScreenElement = document.querySelector('#flag-screen');
const flagDisplayElement = document.querySelector('.flag-display');
const numberDisplayElement = document.querySelector('.number-display');
const flagStartLightElement = document.querySelector('.flag-start-light');
const startLightTextElement = document.querySelector('.start-light-text');
const dots = Array.from(document.querySelectorAll('.light-dot'));

// ===============================
// SOCKETS
// ===============================

socket.on('connect',()=>{
    clientScreen.id=socket.id;
    screenNameElement.innerHTML=socket.id;
    socket.emit('sectionUpdate',({section:clientScreen.section}))
})

socket.on('disconnect',()=>{
    screenNameElement.innerHTML='server disconnected!!!';
})

socket.on('updateClient',({sections, config})=>{
    serverState=sections;
    updateSettings(config);
})

socket.on('clickStart', ({btn, text, time})=> {
    // console.log(`clicked ${btn} text: ${text} time:${time}`);
    if(section!=0) return;
    if (btn=='start') {
        runStartSequence();
    } else if (btn=='abortStart') {
        abortStart();
    } else if (btn=='closeStart') {
        closeStartModal();
    } else if (btn=='startIntro') {
        openStartModal();
        runStartIntro(time,text);
    } else if (btn=='rollingStart') {
        runRollingStartSequence();
    }
})

// ===============================
// HELPER FUNCTIONS
// ===============================

function updateSettings(config) {
    let styles = [...document.styleSheets[0].cssRules];

    styles
        .find(res=>res.selectorText==".blink-animation")
        .style.animationDuration=config.blinkTime+'ms'
    
    carouselMs = config.shiftTime;
}

function startFlagCarousel() {

    setTimeout(startFlagCarousel, carouselMs);

    let thisSection = serverState.find(el=>el.section==section);
    let alternatingFlag = thisSection.flags[carouselCounter % thisSection.flags.length];
    let displayDiv = document.querySelector('.flag-display');
    let carNumDiv = document.querySelector('.carNum');
    let dateDiv = document.querySelector('.flag-display-date');

    let currentDate = new Date();

    if(thisSection && thisSection.flags.length < 1) {
        displayDiv.className="flag-display";
        dateDiv.innerText=`${currentDate.toLocaleString().slice(11,16)}`;
        carNumDiv.innerText = '';
    } else {
        let numLength = (alternatingFlag.hasOwnProperty('number')) ? alternatingFlag.number.length : '';
        displayDiv.className=`
            flag-display 
            flag 
            ${alternatingFlag.name} 
            ${(alternatingFlag.blink) ? 'blink-animation': ''}
            ${(numLength==1) ? 'xxl' : ''}
            ${(numLength==2) ? 'xl' : ''}
        `;
        //refactor this
        carNumDiv.innerText = (alternatingFlag.number) ? alternatingFlag.number : '' ;
        dateDiv.innerText='';
    }

    carouselCounter++;
}

function runStartIntro(time=2, text='infotext') {
    let countdownTimer = time*60;
    
    dots.forEach(el=>el.classList.remove('blink-animation'));
    startLightTextElement.style.display='initial';

    countdown()
    
    function countdown() {
        if(isAbortStart) return;

        startLightTextElement.innerText=`${text} \n \n Time to start \n ${Math.ceil(countdownTimer/60)}:00`;
        setTimeout(() => {
            countdownTimer--;
            if(countdownTimer > 0) {
                countdown();
            } else {
                startLightTextElement.innerText=`START`;
            }    
        }, 1000);
    }
}

function runStartSequence() {
    startLightTextElement.style.display='none';
    dots.forEach(el=>el.classList.remove('blink-animation'));
    isAbortStart=false;  
    let dotIndex=0;
    countdownLights();

    function countdownLights() {
        if (isAbortStart) { 
            abortStart();
            return;
        }
        if (dotIndex>5) return;
    
        if (dotIndex<5) {     
            setTimeout(() => {
                dots[dotIndex].style.background='red';
                dots[dotIndex].style.boxShadow='0rem 15vh red';
                dotIndex++;
                countdownLights();
            }, 1000);
        } else {
            let delay = Math.random() * 4.8 + .2;
            setTimeout(() => {
                dots.forEach(el=>el.style.background='black')
                dots.forEach(el=>el.style.boxShadow='0rem 15vh black');
            }, delay * 1000);
        }
    }
}

function runRollingStartSequence() {
    startLightTextElement.style.display='none';
    isAbortStart=false;  
    dots.forEach(el=>el.classList.remove('blink-animation'));
    dots.forEach(el=>el.style.background='green')
    dots.forEach(el=>el.style.boxShadow='0rem 15vh black');
}

function closeStartModal() {
    flagStartLightElement.classList.remove('open');
    dots.forEach(el=>el.style.background='black');
    dotIndex=0;
    isAbortStart=true;
    dots.forEach(el=>el.classList.remove('blink-animation'));
    startLightTextElement.style.display='none';
}

function openStartModal() {
    dots.forEach(el=>el.style.background='black');
    dots.forEach(el=>el.style.boxShadow='0rem 15vh black');
    flagStartLightElement.classList.add('open');
    dotIndex=0;
    isAbortStart=false;  
}

function abortStart() {
    startLightTextElement.style.display='none';
    isAbortStart=true;
    dots.forEach(el=>el.style.background='red');
    dots.forEach(el=>el.style.boxShadow='0rem 15vh black');
    dots.forEach(el=>el.classList.add('blink-animation'));
}