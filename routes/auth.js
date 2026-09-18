var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var db = require('../db');

var router = express.Router();

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '7d'
        }
    );
}


/*
 * 회원가입
 * POST /api/auth/register
 */
router.post('/register', async function(req, res) {
    try {
        var username = req.body.username;
        var password = req.body.password;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '아이디와 비밀번호를 입력해주세요.'
            });
        }

        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                success: false,
                message: '아이디는 3~30자로 입력해주세요.'
            });
        }

        if (password.length < 4) {
            return res.status(400).json({
                success: false,
                message: '비밀번호는 4자 이상 입력해주세요.'
            });
        }

        var existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: '이미 사용 중인 아이디입니다.'
            });
        }

        var passwordHash = await bcrypt.hash(password, 10);

        var result = await db.query(
            `INSERT INTO users (username, password_hash)
             VALUES ($1, $2)
             RETURNING id, username, created_at`,
            [username, passwordHash]
        );

        var user = result.rows[0];

        var token = createToken(user);

        res.json({
            success: true,
            token: token,
            user: user
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: '회원가입 중 오류가 발생했습니다.'
        });
    }
});


/*
 * 로그인
 * POST /api/auth/login
 */
router.post('/login', async function(req, res) {
    try {
        var username = req.body.username;
        var password = req.body.password;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '아이디와 비밀번호를 입력해주세요.'
            });
        }

        var result = await db.query(
            `SELECT id, username, password_hash, created_at
             FROM users
             WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: '아이디 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        var user = result.rows[0];

        var passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: '아이디 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        var token = createToken(user);

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: '로그인 중 오류가 발생했습니다.'
        });
    }
});


/*
 * 내 정보
 * GET /api/auth/me
 */
router.get('/me', require('../middleware/auth'), async function(req, res) {
    try {
        var result = await db.query(
            `SELECT id, username, created_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: '사용자 정보를 조회할 수 없습니다.'
        });
    }
});


module.exports = router;