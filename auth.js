let jwt = require('jsonwebtoken');

function verifyToken(token, secret) {
    try {
        let decoded = jwt.verify(token,secret)
        return decoded;
    } catch(err) {
        return err.message;
    }
}

exports.verifyToken = verifyToken;