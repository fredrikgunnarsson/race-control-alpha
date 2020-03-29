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
        
        socket.on('checkClientScreen',()=>{
            socket.emit('clientScreenInfo','none needed');
        })
        socket.on('updateClient',({sections})=>{
            serverState=sections;
        })
        socket.on('changeCarouselSpeedServer',(ms)=>{
            carouselMs = ms;
        })

        
        // ===============================
        // HELPER FUNCTIONS
        // ===============================


        function startFlagCarousel() {

            setTimeout(startFlagCarousel, carouselMs);

            let thisSection = serverState.find(el=>el.section==section);
            let displayDiv = document.querySelector('.flag-display');

            if(thisSection && thisSection.flags.length < 1) {
                displayDiv.className="flag-display";
                displayDiv.children[0].innerText = '';
            } else {
                let alternatingFlag = thisSection.flags[carouselCounter % thisSection.flags.length];
                displayDiv.className=`
                    flag-display flag ${alternatingFlag.name}
                    ${(alternatingFlag.blink) ? 'blink-animation': ''}
                `;
                //refactor this
                displayDiv.children[0].innerText = (alternatingFlag.number) ? alternatingFlag.number : '' ;
            }

            carouselCounter++;
        }
