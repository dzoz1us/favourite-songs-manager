const express = require('express');
const path = require('path');
const songsRoutes = require('./routes/songsRoutes');
const logger = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(logger);

// Routes
app.use('/api/songs', songsRoutes);

// Дополнительный эндпоинт для проверки здоровья сервера
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Favorite Songs API',
    version: '1.0.0'
  });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Маршрут не найден' 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Внутренняя ошибка сервера!' 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log('📡 API доступен по адресу http://localhost:3000/api/songs');
  console.log('🏥 Health check: http://localhost:3000/health');
});