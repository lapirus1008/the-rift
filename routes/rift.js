var express = require('express');
var db = require('../db');
var auth = require('../middleware/auth');

var router = express.Router();

var RIFT_ID = 'RIFT-001';


/*
 * 균열 시작
 * POST /api/rift/start
 */
router.post('/start', auth, async function(req, res) {
    try {
        var startTime = Date.now();

        res.json({
            success: true,
            riftId: RIFT_ID,
            startTime: startTime
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: '균열 시작에 실패했습니다.'
        });
    }
});


/*
 * 게임 액션
 * POST /api/rift/action
 *
 * 현재 MVP에서는 서버 인증 확인용.
 * 추후 전투 결과 검증을 확장할 수 있음.
 */
router.post('/action', auth, async function(req, res) {
    res.json({
        success: true
    });
});


/*
 * 균열 클리어
 * POST /api/rift/complete
 */
router.post('/complete', auth, async function(req, res) {
    try {
        var startTime = Number(req.body.startTime);

        if (!startTime || !Number.isFinite(startTime)) {
            return res.status(400).json({
                success: false,
                message: '잘못된 게임 시작 정보입니다.'
            });
        }

        var clearTime = Date.now() - startTime;

        if (clearTime < 1000) {
            return res.status(400).json({
                success: false,
                message: '비정상적인 클리어 기록입니다.'
            });
        }

        var result = await db.query(
            `SELECT MIN(clear_time_ms) AS best_time
             FROM rift_records
             WHERE user_id = $1
             AND rift_id = $2`,
            [req.user.id, RIFT_ID]
        );

        var previousBest = result.rows[0].best_time;

        await db.query(
            `INSERT INTO rift_records
             (user_id, rift_id, clear_time_ms)
             VALUES ($1, $2, $3)`,
            [req.user.id, RIFT_ID, clearTime]
        );

        var isNewRecord =
            previousBest === null ||
            clearTime < Number(previousBest);

        res.json({
            success: true,
            clearTime: clearTime,
            isNewRecord: isNewRecord
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: '클리어 기록 저장에 실패했습니다.'
        });
    }
});


/*
 * 전체 랭킹
 * GET /api/rift/ranking
 */
router.get('/ranking', async function(req, res) {
    try {
        var result = await db.query(
            `SELECT
                u.username,
                MIN(r.clear_time_ms) AS clear_time_ms
             FROM rift_records r
             JOIN users u
               ON r.user_id = u.id
             WHERE r.rift_id = $1
             GROUP BY u.id, u.username
             ORDER BY MIN(r.clear_time_ms) ASC
             LIMIT 100`,
            [RIFT_ID]
        );

        res.json({
            success: true,
            riftId: RIFT_ID,
            ranking: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: '랭킹을 불러올 수 없습니다.'
        });
    }
});


/*
 * 내 최고 기록
 * GET /api/rift/my-record
 */
router.get('/my-record', auth, async function(req, res) {
    try {
        var result = await db.query(
            `SELECT
                rift_id,
                clear_time_ms,
                created_at
             FROM rift_records
             WHERE user_id = $1
             AND rift_id = $2
             ORDER BY clear_time_ms ASC
             LIMIT 1`,
            [req.user.id, RIFT_ID]
        );

        res.json({
            success: true,
            record: result.rows.length > 0
                ? result.rows[0]
                : null
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: '내 기록을 불러올 수 없습니다.'
        });
    }
});


module.exports = router;