// ===============================
// INITIALIZATIONS
// ===============================

let socket = io()

let flagsSchema = [{}]

;(function getFlags() {
  return fetch('/api/flags')
    .then((res) => res.json())
    .then((data) => {
      flagsSchema = data
      startFlagCarousel()
    })
})()

let section = document.location.pathname.match(/\/section\/(\d{1,2})/)[1]

let clientScreen = {
  role: 'flag',
  section: section,
  flags: [],
}

let serverState = []
let flagNumber = ''
let carouselCounter = 0
let carouselMs = 1700
let blinkTime = 500
let isAbortStart = false
let timeLeft = 0
let idleText = 'Local Time'
let lapsLeft = 0

const screenNameElement = document.querySelector('#screen-name')
const flagScreenElement = document.querySelector('#flag-screen')
const flagDisplayElement = document.querySelector('.flag-display')
const numberDisplayElement = document.querySelector('.number-display')
const flagStartLightElement = document.querySelector('.flag-start-light')
const startLightTextElement = document.querySelector('.start-light-text')
const dots = Array.from(document.querySelectorAll('.light-dot'))

// ===============================
// SOCKETS
// ===============================

socket.on('connect', () => {
  clientScreen.id = socket.id
  screenNameElement.innerHTML = socket.id
  socket.emit('sectionUpdate', { section: clientScreen.section })
})

socket.on('disconnect', () => {
  screenNameElement.innerHTML = 'server disconnected!!!'
})

socket.on('updateClient', ({ sections, config, race }) => {
  console.log(config)
  serverState = sections
  idleText = race.idleSelection
  lapsLeft = race.lapsLeft
  updateSettings(config)
})

socket.on('clickStart', ({ btn, text, time, length }) => {
  // console.log(`clicked ${btn} text: ${text} time:${time}`);
  if (section != 0) return
  if (btn == 'start') {
    runStartSequence()
  } else if (btn == 'abortStart') {
    abortStart()
  } else if (btn == 'closeStart') {
    closeStartModal()
  } else if (btn == 'startIntro') {
    openStartModal()
    runStartIntro(time, text)
  } else if (btn == 'rollingStart') {
    runRollingStartSequence()
  }
})

socket.on('updateRaceTime', (time) => {
  // console.log(time)
  timeLeft = time
})

socket.on('selectIdle', (idleSelection) => {
  idleText = idleSelection
})

// ===============================
// HELPER FUNCTIONS
// ===============================

function updateSettings(config) {
  let styles = [...document.styleSheets[0].cssRules]

  styles.find(
    (res) => res.selectorText == '.blink-animation'
  ).style.animationDuration = config.blinkTime + 'ms'

  carouselMs = config.shiftTime
}

function startFlagCarousel() {
  setTimeout(startFlagCarousel, carouselMs)

  let thisSection = serverState.find((el) => el.section == section)
  let alternatingFlag =
    thisSection.flags[carouselCounter % thisSection.flags.length]
  let displayDiv = document.querySelector('.flag-display')
  let carNumDiv = document.querySelector('.carNum')
  let titleDiv = document.querySelector('.flag-display-title')
  let dateDiv = document.querySelector('.flag-display-date')

  if (thisSection && thisSection.flags.length < 1) {
    displayDiv.className = 'flag-display'
    titleDiv.innerText = idleText
    if (idleText == 'Local Time') {
      dateDiv.innerText = `${Date().slice(16, 21)}`
    } else if (idleText == 'Time Left') {
      dateDiv.innerText = timeLeft
    } else if (idleText == 'Laps Left') {
      dateDiv.innerText = lapsLeft
    }
    carNumDiv.innerText = ''
  } else {
    let numLength = alternatingFlag.hasOwnProperty('number')
      ? alternatingFlag.number.length
      : ''
    displayDiv.className = `
            flag-display 
            flag 
            ${alternatingFlag.name} 
            ${alternatingFlag.blink ? 'blink-animation' : ''}
            ${numLength == 1 ? 'xxl' : ''}
            ${numLength == 2 ? 'xl' : ''}
        `
    //refactor this
    carNumDiv.innerText = alternatingFlag.number ? alternatingFlag.number : ''
    dateDiv.innerText = ''
    titleDiv.innerText = ''
  }

  carouselCounter++
}

let startEarly = false
function runStartIntro(time = 2, text = 'infotext') {
  let countdownTimer = time * 60

  socket.emit('pauseRaceTimer', true)
  startEarly = false
  dots.forEach((el) => el.classList.remove('blink-animation'))
  startLightTextElement.style.display = 'initial'

  countdown()

  function countdown() {
    if (isAbortStart || startEarly) return

    startLightTextElement.innerText = `${text} \n \n Time to start \n ${Math.ceil(
      countdownTimer / 60
    )}:00`
    setTimeout(() => {
      countdownTimer--
      if (countdownTimer > 0) {
        countdown()
      } else {
        startLightTextElement.innerText = `START`
      }
    }, 1000)
  }
}

function runStartSequence() {
  startEarly = true
  startLightTextElement.innerText = `5 seconds`
  dots.forEach((el) => el.classList.remove('blink-animation'))
  isAbortStart = false
  let dotIndex = 0

  setTimeout(() => {
    startLightTextElement.style.display = 'none'
  }, 2000)
  setTimeout(() => {
    countdownLights()
  }, 4000)

  function countdownLights() {
    if (isAbortStart) {
      abortStart()
      return
    }
    if (dotIndex > 5) return

    if (dotIndex < 5) {
      setTimeout(() => {
        dots[dotIndex].style.background = '#f5012e'
        dots[dotIndex].style.boxShadow = '0rem 19vw #f5012e'
        dotIndex++
        countdownLights()
      }, 1000)
    } else {
      let delay = Math.random() * 4.8 + 0.2
      setTimeout(() => {
        dots.forEach((el) => (el.style.background = 'black'))
        dots.forEach((el) => (el.style.boxShadow = '0rem 19vw black'))
        socket.emit('pauseRaceTimer', false)
      }, delay * 1000)
    }
  }
}

function runRollingStartSequence() {
  startLightTextElement.style.display = 'none'
  isAbortStart = false
  dots.forEach((el) => el.classList.remove('blink-animation'))
  dots.forEach((el) => (el.style.background = '#00cc00'))
  dots.forEach((el) => (el.style.boxShadow = '0rem 19vw black'))
  socket.emit('pauseRaceTimer', false)
}

function closeStartModal() {
  flagStartLightElement.classList.remove('open')
  dots.forEach((el) => (el.style.background = 'black'))
  dotIndex = 0
  isAbortStart = true
  dots.forEach((el) => el.classList.remove('blink-animation'))
  startLightTextElement.style.display = 'none'
}

function openStartModal() {
  dots.forEach((el) => (el.style.background = 'black'))
  dots.forEach((el) => (el.style.boxShadow = '0rem 19vw black'))
  flagStartLightElement.classList.add('open')
  dotIndex = 0
  isAbortStart = false
}

function abortStart() {
  startLightTextElement.style.display = 'none'
  isAbortStart = true
  dots.forEach((el) => (el.style.background = '#f5012e'))
  dots.forEach((el) => (el.style.boxShadow = '0rem 19vw black'))
  dots.forEach((el) => el.classList.add('blink-animation'))
}
