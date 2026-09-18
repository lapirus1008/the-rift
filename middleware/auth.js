var jwt = require('jsonwebtoken');

function auth(req, res, next) {
    var authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: '로그인이 필요합니다.'
        });
    }

    var token = authHeader.substring(7);

    try {
        var decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: '유효하지 않은 로그인 정보입니다.'
        });
    }
}

module.exports = auth;