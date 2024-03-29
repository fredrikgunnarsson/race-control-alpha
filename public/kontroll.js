// ===============================
// INITIALIZATIONS
// ===============================

let socket
let flagsSchema = [{}]
let sectionsSchema
let serverState = []

let carouselCounter = 0
let carouselMs = 1700
let blinkTime = 500

const screenNameElement = document.querySelector('#screen-name')
const selectFlagWrapperElement = document.querySelector('.select-flag-wrapper')
const sectionScreensElement = document.querySelector('.section-screens-wrapper')
const parametersModal = document.querySelector('.parameters')
const startLightModal = document.querySelector('.start-light')
const allScreensBtn = document.querySelector('div[data-btn="all-screens-btn"]')
const mainScreenBtn = document.querySelector('div[data-btn="main-screen-btn"]')
const timeLeft = document.querySelector('.time-left')
const lapsLeft = document.querySelector('.laps-left')
const hideAfterStartElements = Array.from(
  document.querySelectorAll('.hide-after-start')
)
const showOnStartElements = Array.from(
  document.querySelectorAll('.show-on-start')
)

fetch('/api/flags')
  .then((res) => res.json())
  .then((data) => {
    flagsSchema = data.flagsModel
    sectionsSchema = data.sections
    selectFlagWrapperElement.innerHTML = generateSelectFlags()
    document.querySelector('.flag-attributes').innerHTML =
      generateFlagAttributes()
    sectionScreensElement.innerHTML = generateSectionScreens()
    startPreviewCarousel()
    initiateSockets()
  })

// ===============================
// EVENT LISTENERS
// ===============================

document.addEventListener('click', (e) => {
  if (e.target.dataset.btn == 'select-flag') {
    let flag = e.target.dataset.flag
    socket.emit('selectFlag', {
      clickedFlag: flag,
      blink: false,
      allScreens: isAllScreensSelected(),
      mainScreen: isMainScreenSelected(),
    })
  } else if (e.target.dataset.btn == 'select-num-flag') {
    let flag = e.target.dataset.flag
    let numEl = document.querySelector('.car-number-input input')
    let numFlagNumbers = getNumFlagNumbers(flag)

    if (numEl.value > 0) {
      socket.emit('selectFlag', {
        clickedFlag: flag,
        blink: false,
        number: numEl.value,
        allScreens: isAllScreensSelected(),
        mainScreen: isMainScreenSelected(),
      })
      numEl.value = null
    } else if (numFlagNumbers.length == 1) {
      socket.emit('selectFlag', {
        clickedFlag: flag,
        blink: false,
        number: numFlagNumbers[0],
        allScreens: isAllScreensSelected(),
        mainScreen: isMainScreenSelected(),
      })
    } else if (numFlagNumbers.length > 1) {
      // alert(`pick a number ${numFlagNumbers}`)
      pickNumberToDeactivate(flag, numFlagNumbers)
    } else {
      showToast('Inget nummer. Fyll i nummer!', 'red')
    }
  } else if (e.target.dataset.btn == 'blink-btn') {
    let flag = e.target.parentElement.dataset.flag
    socket.emit('selectFlag', {
      clickedFlag: flag,
      blink: true,
      allScreens: isAllScreensSelected(),
      mainScreen: isMainScreenSelected(),
    })
  } else if (e.target.dataset.btn == 'section-btn') {
    socket.emit('clickSection', { section: e.target.dataset.section })
  } else if (e.target.dataset.btn == 'parameters-btn') {
    parametersModal.classList.toggle('open')
  } else if (e.target.dataset.btn == 'parameters-close-btn') {
    parametersModal.classList.toggle('open')
  } else if (e.target.dataset.btn == 'all-screens-btn') {
    allScreensBtn.classList.toggle('btn-green')
  } else if (e.target.dataset.btn == 'main-screen-btn') {
    mainScreenBtn.classList.toggle('btn-green')
  } else if (e.target.dataset.btn == 'idle-local-time-btn') {
    socket.emit('clickIdleSelection', { btn: 'Local Time' })
  } else if (e.target.dataset.btn == 'idle-time-left-btn') {
    socket.emit('clickIdleSelection', { btn: 'Time Left' })
  } else if (e.target.dataset.btn == 'idle-laps-left-btn') {
    socket.emit('clickIdleSelection', { btn: 'Laps Left' })
  } else if (e.target.dataset.btn == 'time-left-pause-btn') {
    socket.emit('pauseRaceTimer', null)
  } else if (e.target.dataset.btn == 'laps-left-decrease-btn') {
    socket.emit('decreaseLapsLeft', null)
  } else if (e.target.dataset.btn == 'start-light-btn') {
    startLightModal.classList.toggle('open')
  } else if (e.target.dataset.btn == 'start-light-close-btn') {
    startLightModal.classList.toggle('open')
  } else if (e.target.dataset.btn == 'start-intro-btn') {
    let startMinutes = document.querySelector('#start-minutes').value
    let infoText = document.querySelector('#start-infotext').value
    let raceLength = document.querySelector('#start-length').value
    let laps = document.querySelector('#start-laps').value
    socket.emit('clickStart', {
      btn: 'startIntro',
      text: infoText,
      time: startMinutes,
      length: raceLength,
      laps: laps,
    })
  } else if (e.target.dataset.btn == 'start-btn') {
    socket.emit('clickStart', { btn: 'start' })
  } else if (e.target.dataset.btn == 'rolling-start-btn') {
    socket.emit('clickStart', { btn: 'rollingStart' })
  } else if (e.target.dataset.btn == 'abort-start-btn') {
    socket.emit('clickStart', { btn: 'abortStart' })
  } else if (e.target.dataset.btn == 'close-start-btn') {
    socket.emit('clickStart', { btn: 'closeStart' })
  }
})

// ===============================
// MAIN FUNCTIONS
// ===============================

function changeCarouselSpeed(ms) {
  showToast(`Ny flaggrotation ${ms}ms`, 'green')
  socket.emit('changeCarouselSpeed', ms)
}

function changeBlinkSpeed(ms) {
  showToast(`Ny blinkhastighet ${ms}ms`, 'green')
  socket.emit('changeBlinkSpeed', ms)
}

function changeNumberOfScreens(num) {
  showToast(`${num} skärmar`)
  socket.emit('changeNumberOfScreens', num)
}

function updateSettings(config) {
  let styles = [...document.styleSheets[0].cssRules]

  styles.find(
    (res) => res.selectorText == '.blink-animation'
  ).style.animationDuration = config.blinkTime + 'ms'

  carouselMs = config.shiftTime
  document.querySelector('.settingFlaggrotation').value = config.shiftTime
  document.querySelector('.settingBlinkhastighet').value = config.blinkTime
  document.querySelector('.settingAntalSkärmar').value = config.numberOfScreens
}

function drawControlScreen() {
  drawSections()
  drawFlagSelectors()

  function drawSections() {
    serverState.forEach((el) => {
      let sectionEl = document.querySelector(`[data-section="${el.section}"]`)
      let opacity = el.clients.length > 0 ? '1' : '.2'

      sectionEl.style.opacity = opacity
      el.active
        ? sectionEl.classList.add('selected')
        : sectionEl.classList.remove('selected')
    })
  }

  function drawFlagSelectors() {
    let activeSection = serverState.find((el) => el.active)
    const allSelectFlagsElements = document.querySelectorAll(
      '.select-flag.selected'
    )

    allSelectFlagsElements.forEach((el) =>
      el.classList.remove('selected', 'blinkActive')
    )

    if (!activeSection || activeSection.flags.length == 0) return
    activeSection.flags.forEach((flag) => {
      document
        .querySelector(`.select-flag.${flag.name}`)
        .classList.add('selected', flag.blink ? 'blinkActive' : null)
    })
  }
}

function initiateSockets() {
  socket = io()

  socket.on('connect', () => {
    console.log('client connected...')

    screenNameElement.innerHTML = socket.id
  })

  socket.on('disconnect', () => {
    screenNameElement.innerHTML = 'server disconnected!!!'
  })

  socket.on('updateClient', ({ sections, config, options, race }) => {
    serverState = sections
    sectionsSchema = sections
    lapsLeft.innerText = `Laps left: ${race.lapsLeft}`

    if (options && options.changeNumberOfScreens) {
      sectionScreensElement.innerHTML = generateSectionScreens()
    }

    updateSettings(config)
    drawControlScreen()
  })

  socket.on('showToast', ({ msg, color }) => {
    showToast(msg, color)
  })

  socket.on('updateRaceTime', (time) => {
    timeLeft.innerText = `Time left: ${time}`
  })

  socket.on('clickStart', ({ btn, text, time }) => {
    // console.log(`clicked ${btn} text: ${text} time:${time}`);
    if (btn == 'start') {
      // runStartSequence();
      document.querySelector('[data-btn="rolling-start-btn"]').style.opacity =
        '.3'
    } else if (btn == 'abortStart') {
      // abortStart();
      hideAfterStartElements.forEach((el) => (el.style.opacity = '1'))
      showOnStartElements.forEach((el) => (el.style.opacity = '.3'))
    } else if (btn == 'closeStart') {
      // closeStartModal();
      hideAfterStartElements.forEach((el) => (el.style.opacity = '1'))
      showOnStartElements.forEach((el) => (el.style.opacity = '.3'))
    } else if (btn == 'startIntro') {
      hideAfterStartElements.forEach((el) => (el.style.opacity = '.3'))
      showOnStartElements.forEach((el) => (el.style.opacity = '1'))
    } else if (btn == 'rollingStart') {
      // runRollingStartSequence();
      document.querySelector('[data-btn="start-btn"]').style.opacity = '.3'
    }
  })
}

// ===============================
// HELPER FUNCTIONS
// ===============================

function startPreviewCarousel() {
  setTimeout(startPreviewCarousel, carouselMs)
  serverState.forEach((screen) => {
    let screenDiv = document.querySelector(`[data-section="${screen.section}"]`)
    if (screen.clients.length < 1 || screen.flags.length < 1) {
      screenDiv.className = 'btn section-screen'
      screenDiv.children[0].innerText = ''
    } else {
      let thisScreen = screen.flags[carouselCounter % screen.flags.length]
      screenDiv.className = `
                btn section-screen flag ${thisScreen.name}
                ${thisScreen.blink ? 'blink-animation' : ''}`
      // refactor this
      screenDiv.children[0].innerText = thisScreen.number
        ? thisScreen.number
        : ''
    }
    if (screen.active) screenDiv.classList.add('selected')
  })

  carouselCounter++
}

function generateSelectFlags() {
  let flagHTML = ''
  flagsSchema.sort((a, b) => {
    if (a.sort < b.sort) return -1
  })
  flagsSchema.forEach((flag) => {
    flagHTML += `
        <div 
            data-btn="${flag.needNumber ? 'select-num-flag' : 'select-flag'}" 
            data-flag="${flag.name}" 
            class="select-flag flag ${flag.name}"
        >
            <div class="${flag.needNumber ? 'need-number' : null}"></div>
            <div class="prio">${flag.prio}</div>
            <div class="${flag.isSignal ? 'signal' : null}"></div>
            <div class="${flag.pause ? 'pause' : null}"></div>
            <div class="${flag.allScreen ? 'all-screen' : null}"></div>
            <div class="${flag.canSave ? 'save' : null}"></div>
            <div 
                data-btn="blink-btn" 
                data-flag="${flag.name}" 
                class="blink ${flag.canBlink ? 'can-blink' : ''}"
            >
                <svg style="pointer-events:none" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 512 512" version="1.1" viewBox="0 0 512 512" xml:space="preserve">
                    <path d="m400.27 175.6c-1.399-3.004-4.412-4.932-7.731-4.932h-101.12l99.797-157.57c1.664-2.628 1.766-5.956 0.265-8.678-1.502-2.731-4.37-4.421-7.476-4.421h-136.53c-3.234 0-6.187 1.826-7.637 4.719l-128 256c-1.323 2.637-1.178 5.777 0.375 8.294 1.562 2.517 4.301 4.053 7.262 4.053h87.748l-95.616 227.09c-1.63 3.883-0.179 8.388 3.413 10.59 1.382 0.845 2.918 1.254 4.446 1.254 2.449 0 4.864-1.05 6.537-3.029l273.07-324.27c2.141-2.542 2.602-6.092 1.203-9.104z"/>
                </svg>  
            </div>
        </div>`
  })
  return flagHTML
}

function generateSectionScreens() {
  let sectionHTML = ''
  sectionsSchema.forEach((section) => {
    if (section.section == 0) return

    sectionHTML += `
        <div class="btn section-screen" data-btn="section-btn" data-section="${section.section}">
            <div class="carNum"></div>
            <div class="sectorLabel">${section.section}</div>
        </div>
        `
  })
  return sectionHTML
}

function generateFlagAttributes() {
  let flagHTML = ''

  flagHTML += `
    <table>
    <tr>
        <th>Flagga</th>
        <th>Behöver nummer</th>
        <th>Kan Blinka</th>
        <th>Prio</th>
        <th>Tillåt spara</th>
        <th>Pausar flaggor</th>
        <th>Alla skärmar</th>
        <th>Är signalflagga</th>
        <th>Sortering</th>
    </tr>
    `
  flagsSchema.forEach((flag, id) => {
    flagHTML += '<tr>'
    Object.keys(flag).forEach((key) => {
      if (typeof flag[key] == 'boolean') {
        flagHTML += `<td><input onchange="changeFlagParameter(this,{type:'checkbox'})" type="checkbox" data-row="${id}" data-param="${key}" ${
          flag[key] ? 'checked' : ''
        }></td>`
      } else {
        flagHTML += `<td onclick="this.contentEditable=true;this.focus()" onblur="changeFlagParameter(this)" data-row="${id}" data-param="${key}">${flag[key]}</td>`
      }
    })
    flagHTML += '</tr>'
  })
  flagHTML += '</table>'
  return flagHTML
}

function changeFlagParameter(cell, { type } = 0) {
  if (type == 'checkbox') {
    flagsSchema[cell.dataset.row][cell.dataset.param] = cell.checked
  } else {
    flagsSchema[cell.dataset.row][cell.dataset.param] = Number(cell.innerText)
    cell.contentEditable = false
  }
  selectFlagWrapperElement.innerHTML = generateSelectFlags()
  document.querySelector('.flag-attributes').innerHTML =
    generateFlagAttributes()
  socket.emit('changeFlagAttributes', flagsSchema)
}

function getNumFlagNumbers(flag) {
  let activeScreen = sectionsSchema.find((el) => el.active)
  if (isMainScreenSelected())
    activeScreen = sectionsSchema.find((el) => el.section == 0)
  if (!activeScreen) return false
  let clickedFlag = activeScreen.flags
    .filter((el) => el.name == flag)
    .map((el) => el.number)
  if (clickedFlag.length == 0) return false
  return clickedFlag
}

function pickNumberToDeactivate(flag, numFlagNumbers) {
  let newEl = document.createElement('div')
  newEl.className = 'deactivate-number-modal'
  numFlagNumbers.forEach((num) => {
    let newNumEl = document.createElement('div')
    newNumEl.className = 'deactivate-number-modal-num'
    newNumEl.innerText = `släck nr ${num}`
    newNumEl.onclick = () => {
      socket.emit('selectFlag', {
        clickedFlag: flag,
        blink: false,
        number: num,
        allScreens: isAllScreensSelected(),
        mainScreen: isMainScreenSelected(),
      })
      document.querySelector('.deactivate-number-modal').remove()
    }
    newEl.appendChild(newNumEl)
  })
  document.querySelector('body').appendChild(newEl)
  // socket.emit('selectFlag', {clickedFlag:flag,blink:false,number:numFlagNumbers[0]})
}

function showToast(msg, color) {
  let newWarning
  let newEl = document.createElement('div')
  newEl.className = 'toast'
  newEl.innerText = msg
  if (color) newEl.style.backgroundColor = color
  if (color == 'red') {
    newWarning = document.createElement('div')
    newWarning.className = 'warning'
    newWarning.innerText = msg
    document.querySelector('body').appendChild(newWarning)
  }
  document.querySelector('body').appendChild(newEl)
  setTimeout(() => {
    if (newWarning) newWarning.remove()
    newEl.remove()
  }, 2500)
}

function isAllScreensSelected() {
  let isTrue = allScreensBtn.className.includes('green')
  if (isTrue) allScreensBtn.classList.toggle('btn-green')
  return isTrue
}

function isMainScreenSelected() {
  let isTrue = mainScreenBtn.className.includes('green')
  // if (isTrue) mainScreenBtn.classList.toggle('btn-green');
  return isTrue
}

setInterval(() => {
  document.querySelector('.clock').innerText = Date().slice(0, 24)
}, 1000)

// ping for Heroku to stay alive
setInterval(() => {
  fetch(`${window.location.origin}/screens`)
    .then((res) => res.text())
    .then(console.log('ping'))
}, 1000 * 60 * 10)
