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

        const screenNameElement = document.querySelector('#screen-name');
        const flagScreenElement = document.querySelector('#flag-screen');
        const flagDisplayElement = document.querySelector('.flag-display');
        const numberDisplayElement = document.querySelector('.number-display');

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

            if(thisSection && thisSection.flags.length < 1) {
                displayDiv.className="flag-display";
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
            }

            carouselCounter++;
        }
