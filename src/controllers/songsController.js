const fs = require('fs').promises;
const path = require('path');

const songsFilePath = path.join(__dirname, '../data/songs.json');

// Чтение песен из файла
const readSongs = async () => {
  try {
    const data = await fs.readFile(songsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

// Запись песен в файл
const writeSongs = async (songs) => {
  await fs.writeFile(songsFilePath, JSON.stringify(songs, null, 2), 'utf8');
};

// Функции валидации
const validateYear = (year) => {
  const currentYear = new Date().getFullYear();
  if (year && (isNaN(year) || year < 1900 || year > currentYear)) {
    return {
      valid: false,
      message: `Год выпуска должен быть числом от 1900 до ${currentYear}`
    };
  }
  return { valid: true };
};

const validateDuration = (duration) => {
  if (!duration) return { valid: true };
  
  // Проверяем формат мм:сс или чч:мм:сс
  const durationRegex = /^([0-5]?\d):([0-5]?\d)(?::([0-5]?\d))?$/;
  
  if (!durationRegex.test(duration)) {
    return {
      valid: false,
      message: 'Длительность должна быть в формате мм:сс или чч:мм:сс (например, 3:45 или 1:23:45)'
    };
  }
  
  // Проверяем, что длительность не слишком большая (максимум 59:59:59)
  const parts = duration.split(':').map(Number);
  if (parts.length === 2) {
    // мм:сс
    const [minutes, seconds] = parts;
    if (minutes > 59 || seconds > 59) {
      return {
        valid: false,
        message: 'Минуты и секунды должны быть от 0 до 59'
      };
    }
  } else if (parts.length === 3) {
    // чч:мм:сс
    const [hours, minutes, seconds] = parts;
    if (hours > 59 || minutes > 59 || seconds > 59) {
      return {
        valid: false,
        message: 'Часы, минуты и секунды должны быть от 0 до 59'
      };
    }
  }
  
  return { valid: true };
};

const validateTitle = (title) => {
  if (!title || title.trim().length === 0) {
    return {
      valid: false,
      message: 'Название песни обязательно'
    };
  }
  
  if (title.length > 100) {
    return {
      valid: false,
      message: 'Название песни не должно превышать 100 символов'
    };
  }
  
  return { valid: true };
};

const validateArtist = (artist) => {
  if (!artist || artist.trim().length === 0) {
    return {
      valid: false,
      message: 'Исполнитель обязателен'
    };
  }
  
  if (artist.length > 100) {
    return {
      valid: false,
      message: 'Имя исполнителя не должно превышать 100 символов'
    };
  }
  
  return { valid: true };
};

const validateGenre = (genre) => {
  if (genre && genre.length > 50) {
    return {
      valid: false,
      message: 'Название жанра не должно превышать 50 символов'
    };
  }
  
  return { valid: true };
};

// Получить все песни
const getAllSongs = async (req, res) => {
  try {
    const songs = await readSongs();
    const { artist, genre, limit, sort = 'id', order = 'asc' } = req.query;
    
    let filteredSongs = [...songs];
    
    // Фильтрация по артисту
    if (artist) {
      filteredSongs = filteredSongs.filter(song => 
        song.artist.toLowerCase().includes(artist.toLowerCase())
      );
    }
    
    // Фильтрация по жанру
    if (genre) {
      filteredSongs = filteredSongs.filter(song => 
        song.genre.toLowerCase().includes(genre.toLowerCase())
      );
    }
    
    // Сортировка
    const sortOrder = order === 'desc' ? -1 : 1;
    filteredSongs.sort((a, b) => {
      if (sort === 'year') {
        return (a.year - b.year) * sortOrder;
      } else if (sort === 'title') {
        return a.title.localeCompare(b.title) * sortOrder;
      } else if (sort === 'artist') {
        return a.artist.localeCompare(b.artist) * sortOrder;
      } else if (sort === 'duration') {
        const durationToSeconds = (dur) => {
          const parts = dur.split(':').map(Number);
          if (parts.length === 2) return parts[0] * 60 + parts[1];
          if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
          return 0;
        };
        return (durationToSeconds(a.duration) - durationToSeconds(b.duration)) * sortOrder;
      }
      // По умолчанию сортируем по ID
      return (a.id - b.id) * sortOrder;
    });
    
    // Лимит
    if (limit && !isNaN(limit) && limit > 0) {
      filteredSongs = filteredSongs.slice(0, parseInt(limit));
    }
    
    res.json({
      success: true,
      count: filteredSongs.length,
      total: songs.length,
      filters: {
        artist: artist || null,
        genre: genre || null,
        limit: limit || null,
        sort,
        order
      },
      data: filteredSongs
    });
  } catch (error) {
    console.error('Ошибка при получении песен:', error);
    res.status(500).json({ 
      success: false,
      error: 'Не удалось загрузить песни' 
    });
  }
};

// Получить песню по ID
const getSongById = async (req, res) => {
  try {
    const songs = await readSongs();
    const song = songs.find(s => s.id === parseInt(req.params.id));
    
    if (!song) {
      return res.status(404).json({ 
        success: false,
        error: 'Песня не найдена' 
      });
    }
    
    res.json({
      success: true,
      data: song
    });
  } catch (error) {
    console.error('Ошибка при получении песни:', error);
    res.status(500).json({ 
      success: false,
      error: 'Не удалось загрузить песню' 
    });
  }
};

// Добавить новую песню
const addSong = async (req, res) => {
  try {
    const songs = await readSongs();
    const { title, artist, year, genre, duration } = req.body;
    
    // Валидация всех полей
    const titleValidation = validateTitle(title);
    const artistValidation = validateArtist(artist);
    const yearValidation = validateYear(year);
    const genreValidation = validateGenre(genre);
    const durationValidation = validateDuration(duration);
    
    // Собираем все ошибки
    const errors = [];
    if (!titleValidation.valid) errors.push(titleValidation.message);
    if (!artistValidation.valid) errors.push(artistValidation.message);
    if (!yearValidation.valid) errors.push(yearValidation.message);
    if (!genreValidation.valid) errors.push(genreValidation.message);
    if (!durationValidation.valid) errors.push(durationValidation.message);
    
    // Если есть ошибки, возвращаем их все сразу
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Ошибки валидации',
        details: errors
      });
    }
    
    // Проверяем, не существует ли уже такая песня
    const existingSong = songs.find(s => 
      s.title.toLowerCase() === title.toLowerCase() && 
      s.artist.toLowerCase() === artist.toLowerCase()
    );
    
    if (existingSong) {
      return res.status(409).json({
        success: false,
        error: 'Эта песня уже существует в вашей коллекции'
      });
    }
    
    const newSong = {
      id: songs.length > 0 ? Math.max(...songs.map(s => s.id)) + 1 : 1,
      title: title.trim(),
      artist: artist.trim(),
      year: year || new Date().getFullYear(),
      genre: (genre || 'Не указан').trim(),
      duration: duration || '0:00',
      addedDate: new Date().toISOString(),
      plays: 0
    };
    
    songs.push(newSong);
    await writeSongs(songs);
    
    res.status(201).json({
      success: true,
      message: 'Песня успешно добавлена',
      data: newSong
    });
  } catch (error) {
    console.error('Ошибка при добавлении песни:', error);
    res.status(500).json({ 
      success: false,
      error: 'Не удалось добавить песню' 
    });
  }
};

// Обновить песню
const updateSong = async (req, res) => {
  try {
    const songs = await readSongs();
    const songId = parseInt(req.params.id);
    const index = songs.findIndex(s => s.id === songId);
    
    if (index === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Песня не найдена' 
      });
    }
    
    const updates = req.body;
    const errors = [];
    
    // Валидация обновляемых полей
    if (updates.title !== undefined) {
      const titleValidation = validateTitle(updates.title);
      if (!titleValidation.valid) errors.push(titleValidation.message);
    }
    
    if (updates.artist !== undefined) {
      const artistValidation = validateArtist(updates.artist);
      if (!artistValidation.valid) errors.push(artistValidation.message);
    }
    
    if (updates.year !== undefined) {
      const yearValidation = validateYear(updates.year);
      if (!yearValidation.valid) errors.push(yearValidation.message);
    }
    
    if (updates.genre !== undefined) {
      const genreValidation = validateGenre(updates.genre);
      if (!genreValidation.valid) errors.push(genreValidation.message);
    }
    
    if (updates.duration !== undefined) {
      const durationValidation = validateDuration(updates.duration);
      if (!durationValidation.valid) errors.push(durationValidation.message);
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Ошибки валидации',
        details: errors
      });
    }
    
    // Если обновляется название или исполнитель, проверяем на дубликат
    if ((updates.title || updates.artist) && songs.some((s, i) => 
      i !== index && 
      s.title.toLowerCase() === (updates.title || songs[index].title).toLowerCase() && 
      s.artist.toLowerCase() === (updates.artist || songs[index].artist).toLowerCase()
    )) {
      return res.status(409).json({
        success: false,
        error: 'Песня с таким названием и исполнителем уже существует'
      });
    }
    
    const updatedSong = {
      ...songs[index],
      ...Object.fromEntries(
        Object.entries(updates)
          .filter(([key, value]) => value !== undefined)
          .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      ),
      id: songId, // Защищаем ID от изменения
      updatedDate: new Date().toISOString()
    };
    
    songs[index] = updatedSong;
    await writeSongs(songs);
    
    res.json({
      success: true,
      message: 'Песня успешно обновлена',
      data: updatedSong
    });
  } catch (error) {
    console.error('Ошибка при обновлении песни:', error);
    res.status(500).json({ 
      success: false,
      error: 'Не удалось обновить песню' 
    });
  }
};

// Удалить песню
const deleteSong = async (req, res) => {
  try {
    const songs = await readSongs();
    const songId = parseInt(req.params.id);
    const index = songs.findIndex(s => s.id === songId);
    
    if (index === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Песня не найдена' 
      });
    }
    
    const deletedSong = songs.splice(index, 1)[0];
    await writeSongs(songs);
    
    res.json({
      success: true,
      message: 'Песня успешно удалена',
      data: deletedSong
    });
  } catch (error) {
    console.error('Ошибка при удалении песни:', error);
    res.status(500).json({ 
      success: false,
      error: 'Не удалось удалить песню' 
    });
  }
};

// Получить статистику
const getStats = async (req, res) => {
  try {
    const songs = await readSongs();
    
    const stats = {
      totalSongs: songs.length,
      totalArtists: new Set(songs.map(s => s.artist)).size,
      totalGenres: new Set(songs.filter(s => s.genre !== 'Не указан').map(s => s.genre)).size,
      totalDuration: songs.reduce((total, song) => {
        const durationToSeconds = (dur) => {
          const parts = dur.split(':').map(Number);
          if (parts.length === 2) return parts[0] * 60 + parts[1];
          if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
          return 0;
        };
        return total + durationToSeconds(song.duration);
      }, 0),
      oldestSong: songs.length > 0 ? songs.reduce((oldest, current) => 
        current.year < oldest.year ? current : oldest
      ) : null,
      newestSong: songs.length > 0 ? songs.reduce((newest, current) => 
        current.year > newest.year ? current : newest
      ) : null,
      byGenre: {},
      byYear: {}
    };
    
    // Статистика по жанрам
    songs.forEach(song => {
      const genre = song.genre || 'Не указан';
      stats.byGenre[genre] = (stats.byGenre[genre] || 0) + 1;
    });
    
    // Статистика по годам
    songs.forEach(song => {
      stats.byYear[song.year] = (stats.byYear[song.year] || 0) + 1;
    });
    
    // Преобразуем общую длительность в читаемый формат
    const seconds = stats.totalDuration;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    stats.totalDurationFormatted = hours > 0 
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes}:${secs.toString().padStart(2, '0')}`;
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ 
      success: false,
      error: 'Не удалось получить статистику' 
    });
  }
};

module.exports = {
  getAllSongs,
  getSongById,
  addSong,
  updateSong,
  deleteSong,
  getStats
};