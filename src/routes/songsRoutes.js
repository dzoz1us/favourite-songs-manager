const express = require('express');
const router = express.Router();
const songsController = require('../controllers/songsController');

// GET /api/songs - все песни
router.get('/', songsController.getAllSongs);

// GET /api/songs/stats - статистика
router.get('/stats', songsController.getStats);

// GET /api/songs/:id - песня по ID
router.get('/:id', songsController.getSongById);

// POST /api/songs - добавить песню
router.post('/', songsController.addSong);

// PUT /api/songs/:id - обновить песню
router.put('/:id', songsController.updateSong);

// DELETE /api/songs/:id - удалить песню
router.delete('/:id', songsController.deleteSong);

module.exports = router;