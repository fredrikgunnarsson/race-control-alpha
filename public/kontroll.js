// ===============================
// INITIALIZATIONS
// ===============================

let socket='';
let flagsSchema = [{}];
let serverState=[];
let role='control';

let flagNumber='';
let carouselIdxFlag = 0;
let carouselIdxPreview = 0;

const screenNameElement = document.querySelector('#screen-name');
const controlScreenElement = document.querySelector('#control-screen');
const flagScreenElement = document.querySelector('#flag-screen');
const clockBannerElement = document.querySelectorAll('.clock');
const selectFlagWrapperElement = document.querySelector('.select-flag-wrapper');
const previewScreenElement = document.querySelector('.preview-screen');
const previewScreenNumberElement = document.querySelector('.preview-screen-number');
const flagDisplayElement = document.querySelector('.flag-display');
const numberDisplayElement = document.querySelector('.number-display');
const enterNumberModalElement = document.querySelector('.enter-number-modal');
const enterNumberInput = document.querySelector('#enter-number');
const submitNumberBtn = document.querySelector('#submit-number');

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
        socket.emit('selectFlag2', {clickedFlag:flag,blink:false} )
    }
    else if (e.target.dataset.btn=='blink-btn') {
        let flag = e.target.parentElement.dataset.flag;
        socket.emit('selectFlag2', {clickedFlag:flag,blink:true})
    }
    // else if(e.target.dataset.btn=='choose-number-btn') {
    //     enterNumberModalElement.style.display='flex';
    //     submitNumberBtn.style.opacity='.4'
    //     enterNumberInput.focus();
    //     flagNumber=e.target.dataset.flag;
    // }
    else if(e.target.dataset.btn=='section-btn') {
        clickSection(e);
    }
    // else if(e.target.dataset.btn=='close-modal-btn') {
    //     closeNumberModal();
    // }
    // else if(e.target.dataset.btn=='submit-number') {
    //     (enterNumberInput.value.length > 0) 
    //         ? closeNumberModal(true) 
    //         : closeNumberModal();
    // }
    else {
        // console.log(e);
    }

})

// document.addEventListener('keyup', (e)=>{
//     if(e.keyCode == 13 && enterNumberModalElement.style.display == 'flex') {
//         (enterNumberInput.value.length > 0) 
//             ? closeNumberModal(true) 
//             : closeNumberModal();
//     } else if (enterNumberModalElement.style.display == 'flex' && enterNumberInput.value.length == 0) {
//         submitNumberBtn.style.opacity='.4'
//     } else if (enterNumberModalElement.style.display == 'flex' && enterNumberInput.value.length > 0) {
//         submitNumberBtn.style.opacity='1';
//     }
//     else {
//         console.log(e);
//     }
// })

// function closeNumberModal(submit) {
//     if (submit) {
//         socket.emit('selectNumber',{flag:flagNumber, number:enterNumberInput.value})
//         console.log(`submit number ${enterNumberInput.value} to ${flagNumber}`)
//     }
//     enterNumberModalElement.style.display='none';
//     enterNumberInput.value='';
//     flagNumber='';
// }




// ===============================
// MAIN FUNCTIONS
// ===============================

function init () {
    
}

function clickSection(e) {
    socket.emit('clickSection',{section:e.target.dataset.section})
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
    socket.on('updateClient',({screens,flags,screens2})=>{
        // console.log('updateClient...');
        serverState=screens2;
        drawControlScreen();
    })
    socket.on('showToast', ({msg, color})=>{
        // console.log('toast?')
        showToast(msg,color);
    })
}

// ===============================
// HELPER FUNCTIONS
// ===============================

function startPreviewCarousel() {
    setTimeout(startPreviewCarousel, 1000);
    serverState.forEach(screen => {
        let screenDiv = document.querySelector(`[data-section="${screen.section}"]`);
        if(screen.clients.length < 1 || screen.flags.length < 1) {
            screenDiv.className="btn section-screen";
        } else {
            let thisScreen = screen.flags[carouselIdxPreview % screen.flags.length];
            screenDiv.className=`
                btn section-screen flag ${thisScreen.name}
                ${(thisScreen.blink) ? 'blink-animation' : ''}
            `
        }
        if(screen.active) screenDiv.classList.add('selected');
    })

    carouselIdxPreview++;
}

function generateSelectFlags() {
    let flagHTML='';
    flagsSchema.forEach(flag => {
        flagHTML+=`
        <div 
            data-btn="select-flag" 
            data-flag="${flag.name}" 
            class="select-flag flag ${flag.name}"
        >
            <div 
                data-btn="blink-btn" 
                data-flag="${flag.name}" 
                class="blink ${(flag.canBlink) ? 'can-blink': ''}"
            >☼
            </div>
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
    clockBannerElement.forEach(el=>{
        el.innerText=Date().slice(16,24)
    })
}, 1000);

