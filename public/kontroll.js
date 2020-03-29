// ===============================
// INITIALIZATIONS
// ===============================

let socket='';
let flagsSchema = [{}];
let serverState=[];
let role='control';

let carouselCounter = 0;
let carouselMs = 1700;

const screenNameElement = document.querySelector('#screen-name');
const controlScreenElement = document.querySelector('#control-screen');
const flagScreenElement = document.querySelector('#flag-screen');
const clockBannerElement = document.querySelector('.clock span');
const selectFlagWrapperElement = document.querySelector('.select-flag-wrapper');
const previewScreenElement = document.querySelector('.preview-screen');
const previewScreenNumberElement = document.querySelector('.preview-screen-number');
const flagDisplayElement = document.querySelector('.flag-display');
const numberDisplayElement = document.querySelector('.number-display');
const enterNumberModalElement = document.querySelector('.enter-number-modal');
const enterNumberInput = document.querySelector('#enter-number');
const submitNumberBtn = document.querySelector('#submit-number');
const parametersModal = document.querySelector('.parameters');

(()=> {
    return fetch('/api/flags')
    .then(res => res.json())
    .then(data => {
        flagsSchema = data;
        selectFlagWrapperElement.innerHTML=generateSelectFlags();
        startPreviewCarousel();
        initiateSockets();
    })
})()

// ===============================
// EVENT LISTENERS
// ===============================

document.addEventListener('click', (e)=>{
    if(e.target.dataset.btn=='select-flag') {
        let flag = e.target.dataset.flag;
        socket.emit('selectFlag', {clickedFlag:flag,blink:false} )
    }
    else if (e.target.dataset.btn=='select-num-flag') {
        let flag = e.target.dataset.flag;
        let numEl = document.querySelector('.car-number-input input');
        let isSelected = [...e.target.classList].includes('selected');

        if (numEl.value > 0 || isSelected) {
            socket.emit('selectFlag', {clickedFlag:flag,blink:false,number:numEl.value})
            numEl.value=null;
        } else {
            showToast('Inget nummer. Fyll i nummer!','red');
        }
        // socket.emit('selectFlag', {clickedFlag:flag,blink:true})
    }
    else if (e.target.dataset.btn=='blink-btn') {
        let flag = e.target.parentElement.dataset.flag;
        socket.emit('selectFlag', {clickedFlag:flag,blink:true})
    }
    else if(e.target.dataset.btn=='section-btn') {
        clickSection(e);
    }
    else if (e.target.dataset.btn=='parameters-btn') {
        parametersModal.style.display='initial';
    }
    else if (e.target.dataset.btn=='parameters-close-btn') {
        parametersModal.style.display='none';
    }
    else {
        // console.log(e);
    }

})

// ===============================
// MAIN FUNCTIONS
// ===============================

function clickSection(e) {
    socket.emit('clickSection',{section:e.target.dataset.section})
}
function changeCarouselSpeed(ms) {
    // carouselMs = ms;
    showToast(`Ny flaggrotation ${ms}ms`,'green')
    socket.emit('changeCarouselSpeed',ms)
}

function drawControlScreen() {
    let activeSection = serverState.filter(el=>el.active)[0]
    const allSelectFlagsElements = document.querySelectorAll('.select-flag.selected');

    allSelectFlagsElements.forEach(el=>el.classList.remove('selected','blinkActive'));
    
    if (activeSection && activeSection.flags.length > 0) {
        activeSection.flags.forEach(flag => {
            document.querySelector(`.select-flag.${flag.name}`)
                .classList.add('selected', (flag.blink) ? 'blinkActive' : null);
        });
    } else {
        // previewScreenElement.innerHTML=`no active flag screens`;
    }

    serverState.forEach(el=>{
        let sectionEl =document.querySelector(`[data-section="${el.section}"]`);
        (el.clients.length>0) 
            ? sectionEl.style.opacity='1' 
            : sectionEl.style.opacity='.2';
        (el.active)
            ? sectionEl.classList.add('selected')
            : sectionEl.classList.remove('selected');
    })
}

function initiateSockets() {

    socket=io();

    socket.on('connect',()=>{
        console.log('client connected...');
        
        screenNameElement.innerHTML=socket.id;
    })
    socket.on('disconnect',()=>{
        screenNameElement.innerHTML='server disconnected!!!';
    })
    socket.on('updateClient',({sections})=>{
        // console.log('updateClient...');
        serverState=sections;
        drawControlScreen();
    })
    socket.on('showToast', ({msg, color})=>{
        showToast(msg,color);
    })
    socket.on('changeCarouselSpeedServer',(ms)=>{
        carouselMs = ms;
    })
}


// ===============================
// HELPER FUNCTIONS
// ===============================

function startPreviewCarousel() {
    setTimeout(startPreviewCarousel, carouselMs);
    serverState.forEach(screen => {
        let screenDiv = document.querySelector(`[data-section="${screen.section}"]`);
        if(screen.clients.length < 1 || screen.flags.length < 1) {
            screenDiv.className="btn section-screen";
            screenDiv.children[0].innerText = '';
        } else {
            let thisScreen = screen.flags[carouselCounter % screen.flags.length];
            screenDiv.className=`
                btn section-screen flag ${thisScreen.name}
                ${(thisScreen.blink) ? 'blink-animation' : ''}`;
            // refactor this
            screenDiv.children[0].innerText = (thisScreen.number) ? thisScreen.number : '' ;
        }
        if(screen.active) screenDiv.classList.add('selected');
    })

    carouselCounter++;
}

function generateSelectFlags() {
    let flagHTML='';
    flagsSchema.forEach(flag => {
        flagHTML+=`
        <div 
            data-btn="${(flag.needNumber) ? 'select-num-flag' : 'select-flag'}" 
            data-flag="${flag.name}" 
            class="select-flag flag ${flag.name}"
        >
            <div 
                class="${(flag.needNumber) ? 'need-number' : null}"
            ></div>
            <div 
                class="${(flag.allScreen) ? 'all-screen' : null}"
            ></div>
            <div 
                data-btn="blink-btn" 
                data-flag="${flag.name}" 
                class="blink ${(flag.canBlink) ? 'can-blink': ''}"
            >☼</div>
        </div>`
    });
    return flagHTML;
}

function showToast(msg,color) {
    let newEl = document.createElement('div');
    newEl.className="toast";
    newEl.innerText=msg;
    if (color) newEl.style.backgroundColor=color;
    document.querySelector('body').appendChild(newEl);
    setTimeout(() => {
        document.querySelectorAll('.toast').forEach(el=>el.remove())
    }, 2500);
}

setInterval(() => {
    clockBannerElement.innerText=Date().slice(0,24);
    // clockBannerElement.innerText=Date().slice(16,24);
}, 1000);
