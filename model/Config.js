const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    shiftTime: {
        type:Number
    },
    blinkTime: {
        type:Number
    },
    numberOfScreens: { 
        type:Number 
    }
});

module.exports = mongoose.model('Config',ConfigSchema);