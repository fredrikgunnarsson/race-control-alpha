        // ===============================
        // INITIALIZATIONS
        // ===============================

        let socket=io();

        let flagsSchema = [{}];

        (function getFlags() {
            return fetch('/api/flags')
            .then(res => res.json())
            .then(data => flagsSchema = data)
        })()
       
        let serverState=[];

        let clientScreen = {
            role:'welcome',
            name:'',
            flags:[],
        }

        let flagNumber=''
        let carouselIdxFlag = 0;
        let carouselIdxPreview = 0;

        const screenNameElement = document.querySelector('#screen-name');
        const welcomeScreenElement = document.querySelector('#welcome-screen');
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

        // ===============================
        // EVENT LISTENERS
        // ===============================

        document.addEventListener('click', (e)=>{
            if(e.target.dataset.btn=='select-flag') {
                let clickedFlag = e.target.dataset.flag;
                // socket.emit('selectFlag', clickedFlag)
                socket.emit('selectFlag2', clickedFlag)
            }
            else if(e.target.dataset.btn=='welcome-btn') {
                welcomeBtnClick(e.target.dataset.role);
            }
            else if(e.target.dataset.btn=='choose-number-btn') {
                enterNumberModalElement.style.display='flex';
                submitNumberBtn.style.opacity='.4'
                enterNumberInput.focus();
                flagNumber=e.target.dataset.flag;
                // console.log('set number', e.target.dataset.flag);
            }
            else if(e.target.dataset.btn=='section-btn') {
                clickSection(e);
            }
            else if(e.target.dataset.btn=='close-modal-btn') {
                closeNumberModal();
            }
            else if(e.target.dataset.btn=='submit-number') {
                (enterNumberInput.value.length > 0) 
                    ? closeNumberModal(true) 
                    : closeNumberModal();
            }
            else {
                console.log(e);
            }

        })

        document.addEventListener('keyup', (e)=>{
            if(e.keyCode == 13 && enterNumberModalElement.style.display == 'flex') {
                (enterNumberInput.value.length > 0) 
                    ? closeNumberModal(true) 
                    : closeNumberModal();
            } else if (enterNumberModalElement.style.display == 'flex' && enterNumberInput.value.length == 0) {
                submitNumberBtn.style.opacity='.4'
            } else if (enterNumberModalElement.style.display == 'flex' && enterNumberInput.value.length > 0) {
                submitNumberBtn.style.opacity='1';
            }
            else {
                console.log(e);
            }
        })

        function closeNumberModal(submit) {
            if (submit) {
                socket.emit('selectNumber',{flag:flagNumber, number:enterNumberInput.value})
                console.log(`submit number ${enterNumberInput.value} to ${flagNumber}`)
            }
            enterNumberModalElement.style.display='none';
            enterNumberInput.value='';
            flagNumber='';
        }

        // ===============================
        // SOCKETS
        // ===============================

        socket.on('connect',()=>{
            clientScreen.id=socket.id;
            screenNameElement.innerHTML=socket.id;
        })
        socket.on('checkClientScreen',()=>{
            socket.emit('clientScreenInfo',{id:socket.id, screen:clientScreen});
        })
        socket.on('updateClient',({screens,flags,screens2})=>{
            clientScreen = screens.filter(el=>el.id==socket.id)[0];
            clientScreen.flags = flags;
            serverState=screens2;
            drawControlScreen(screens2);
        })
        
        // ===============================
        // MAIN FUNCTIONS
        // ===============================

        function welcomeBtnClick(role) {
            welcomeScreenElement.style.display="none";

            if (role=='flag') {
                startFlagCarousel();
                flagScreenElement.style.display="grid";
            } else if (role=='control') {
                selectFlagWrapperElement.innerHTML=generateSelectFlags();
                startPreviewCarousel();
                controlScreenElement.style.display="grid";
            }

            socket.emit('selectScreenRole', {id:socket.id,role:role});
        }

        function clickSection(e) {
            socket.emit('clickSection',{section:e.target.dataset.section})
        }

        function drawControlScreen(screens2) {
            let activeSection = screens2.filter(el=>el.active)[0]
            const allSelectFlagsElements = document.querySelectorAll('.select-flag.selected');

            console.log('main.js',activeSection);
            if (clientScreen.role == 'control') {
                allSelectFlagsElements.forEach(el=>el.classList.remove('selected'));
                
                if (activeSection && activeSection.flags.length > 0) {
                    activeSection.flags.forEach(flag => {
                        document.querySelector(`.select-flag.${flag}`).classList.add('selected');
                    });
                } else {
                    // previewScreenElement.innerHTML=`no active flag screens`;
                }

                screens2.forEach(el=>{
                    let sectionEl =document.querySelector(`[data-section="${el.section}"]`);
                    (el.clients.length>0) 
                        ? sectionEl.style.opacity='1' 
                        : sectionEl.style.opacity='.2';
                    (el.active)
                        ? sectionEl.classList.add('selected')
                        : sectionEl.classList.remove('selected')
                })
            }
        }

        // ===============================
        // HELPER FUNCTIONS
        // ===============================

        function startFlagCarousel() {
            if (clientScreen.flags.length > 0) {
                (carouselIdxFlag + 1 > clientScreen.flags.length - 1) ? carouselIdxFlag=0 : carouselIdxFlag++;
                flagDisplayElement.className=`flag-display flag ${clientScreen.flags[carouselIdxFlag].flag}`;
                numberDisplayElement.innerText = clientScreen.flags[carouselIdxFlag].number;
            } else {
                flagDisplayElement.className=`flag-display`;
                numberDisplayElement.innerText = ''
            }
            setTimeout(startFlagCarousel, 1000);
        }

        function startPreviewCarousel() {
            setTimeout(startPreviewCarousel, 1000);
            //find active screen

            serverState.forEach(screen => {
                let screenDiv = document.querySelector(`[data-section="${screen.section}"]`);
                if(screen.clients.length < 1 || screen.flags.length < 1) {
                    screenDiv.className="btn section-screen";
                } else {
                    screenDiv.className=`btn section-screen flag ${screen.flags[carouselIdxPreview % screen.flags.length]}`
                }
                if(screen.active) screenDiv.classList.add('selected');
            })

            carouselIdxPreview++;

            // let activeScreen = serverState.find(el=>el.active)
            // if(!activeScreen || activeScreen.flags == 0) return null;

            // let no = activeScreen.flags.length;
            // carouselIdxPreview++;

            // console.log(carouselIdxPreview, no, no%carouselIdxPreview);

            // document.querySelector(`[data-section="${activeScreen.section}"]`)
            //     .className = `btn section-screen flag ${activeScreen.flags[carouselIdxPreview%no]}`;
        }
        // startPreviewCarousel2();

        // function startPreviewCarousel() {
        //     if (clientScreen.flags.length > 0) {
        //         (carouselIdxPreview + 1 > clientScreen.flags.length - 1) ? carouselIdxPreview=0 : carouselIdxPreview++;
        //         previewScreenElement.className=`preview-screen flag ${clientScreen.flags[carouselIdxPreview].flag}`;
        //         previewScreenNumberElement.innerText = clientScreen.flags[carouselIdxPreview].number;
        //     } else {
        //         previewScreenElement.className=`preview-screen`;
        //         previewScreenNumberElement.innerText = ''
        //     }
        //     setTimeout(startPreviewCarousel, 1000);
        // }

        function generateSelectFlags() {
            let flagHTML='';
            flagsSchema.forEach(flag => {
                flagHTML+=`
                <div 
                    data-btn="select-flag" 
                    data-flag="${flag.name}" 
                    class="select-flag flag ${flag.name}"
                >
                    <div data-btn="choose-number-btn" data-flag="${flag.name}" class="choose-number-btn">✎</div>
                </div>`
            });
            return flagHTML;
        }

        setInterval(() => {
            clockBannerElement.forEach(el=>{
                el.innerHTML=Date().slice(0,24)
            })
        }, 1000);
