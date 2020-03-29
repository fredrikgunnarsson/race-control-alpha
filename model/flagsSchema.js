const flagsSchema = [
    {
        name:'flag-finish', 
        needNumber:false, 
        canBlink:false, 
        prio:2,
        save:false, 
        pause:false, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-yellow-red', 
        needNumber:false, 
        canBlink:false, 
        prio:5, 
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-green', 
        needNumber:false, 
        canBlink:false, 
        prio:6,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-white', 
        needNumber:false, 
        canBlink:true, 
        prio:4,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-yellow', 
        needNumber:false, 
        canBlink:true, 
        prio:3, 
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-red', 
        needNumber:false, 
        canBlink:true, 
        prio:1, 
        save:false, 
        pause:false, 
        allScreen:true, 
        isSignal:true,
    },
    {
        name:'flag-black', 
        needNumber:true, 
        canBlink:false, 
        prio:10,
        save:true, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-black-white', 
        needNumber:true, 
        canBlink:false, 
        prio:10,
        save:true, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-black-orange', 
        needNumber:true, 
        canBlink:false, 
        prio:10,
        save:true, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-blue', 
        needNumber:false, 
        canBlink:false, 
        prio:10,
        save:false, 
        pause:false, 
        allScreen:false, 
        isSignal:false,
    },
    {
        name:'flag-sc', 
        needNumber:false, 
        canBlink:true, 
        prio:3,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
    {
        name:'flag-vsc', 
        needNumber:false, 
        canBlink:true, 
        prio:3,
        save:false, 
        pause:true, 
        allScreen:false, 
        isSignal:true,
    },
]

module.exports = {
    flagsSchema
};