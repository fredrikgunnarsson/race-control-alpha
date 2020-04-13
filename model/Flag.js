const mongoose = require('mongoose');

const FlagSchema = new mongoose.Schema({
    name: {
        type:String
    },
    needNumber: {
        type:Boolean
    },
    canBlink: {
        type:Boolean
    },
    prio: {
        type:Number
    },
    canSave: {
        type:Boolean
    },
    pause: {
        type:Boolean
    },
    allScreen: {
        type:Boolean
    },
    isSignal: {
        type:Boolean
    }
});

module.exports = mongoose.model('Flag',FlagSchema);