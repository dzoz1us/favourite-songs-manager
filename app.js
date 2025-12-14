document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/songs';
    const songsTableBody = document.getElementById('songsTableBody');
    const addSongForm = document.getElementById('addSongForm');
    const editSongForm = document.getElementById('editSongForm');
    const editModal = document.getElementById('editModal');
    const searchArtist = document.getElementById('searchArtist');
    const searchGenre = document.getElementById('searchGenre');
    const limitResults = document.getElementById('limitResults');
    const applyFilters = document.getElementById('applyFilters');
    const resetFilters = document.getElementById('resetFilters');
    const songCount = document.getElementById('songCount');
    const loading = document.getElementById('loading');

    // Загрузить все песни
    async function loadSongs(filters = {}) {
        try {
            loading.style.display = 'flex';
            songsTableBody.innerHTML = '';
            
            let url = API_URL;
            const queryParams = new URLSearchParams();
            
            if (filters.artist) queryParams.append('artist', filters.artist);
            if (filters.genre) queryParams.append('genre', filters.genre);
            if (filters.limit) queryParams.append('limit', filters.limit);
            
            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }
            
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                displaySongs(result.data);
                songCount.textContent = `${result.count} песен (всего: ${result.total})`;
            } else {
                showError('Ошибка при загрузке песен');
            }
        } catch (error) {
            showError('Не удалось загрузить песни');
        } finally {
            loading.style.display = 'none';
        }
    }

    // Отобразить песни в таблице
    function displaySongs(songs) {
        songsTableBody.innerHTML = '';
        
        if (songs.length === 0) {
            songsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-music" style="font-size: 3rem; color: #6c757d; margin-bottom: 15px;"></i>
                        <p>Песни не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        songs.forEach(song => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${song.title}</strong></td>
                <td>${song.artist}</td>
                <td>${song.year}</td>
                <td><span class="genre-tag">${song.genre}</span></td>
                <td>${song.duration}</td>
                <td class="actions">
                    <button class="btn btn-edit" onclick="editSong(${song.id})">
                        <i class="fas fa-edit"></i> Изменить
                    </button>
                    <button class="btn btn-danger" onclick="deleteSong(${song.id})">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </td>
            `;
            songsTableBody.appendChild(row);
        });
    }

    // Добавить песню
    addSongForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const songData = {
            title: document.getElementById('title').value,
            artist: document.getElementById('artist').value,
            year: document.getElementById('year').value || undefined,
            genre: document.getElementById('genre').value || undefined,
            duration: document.getElementById('duration').value || undefined
        };
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(songData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess(result.message || 'Песня успешно добавлена!');
                addSongForm.reset();
                loadSongs();
            } else {
                // Отображаем детальные ошибки валидации
                if (result.details && Array.isArray(result.details)) {
                    const errorMessages = result.details.map(error => `• ${error}`).join('\n');
                    showError(`Ошибки валидации:\n${errorMessages}`);
                } else {
                    showError(result.error || 'Ошибка при добавлении песни');
                }
            }
        } catch (error) {
            showError('Не удалось добавить песню. Проверьте подключение к серверу.');
        }
    });

    // Редактировать песню (глобальная функция для использования в onclick)
    window.editSong = async function(songId) {
        try {
            const response = await fetch(`${API_URL}/${songId}`);
            const result = await response.json();
            
            if (result.success) {
                const song = result.data;
                document.getElementById('editId').value = song.id;
                document.getElementById('editTitle').value = song.title;
                document.getElementById('editArtist').value = song.artist;
                document.getElementById('editYear').value = song.year;
                document.getElementById('editGenre').value = song.genre;
                document.getElementById('editDuration').value = song.duration;
                
                editModal.classList.add('show');
            }
        } catch (error) {
            showError('Не удалось загрузить данные песни');
        }
    };

    // Сохранить изменения песни
    editSongForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const songId = document.getElementById('editId').value;
        const songData = {
            title: document.getElementById('editTitle').value,
            artist: document.getElementById('editArtist').value,
            year: document.getElementById('editYear').value,
            genre: document.getElementById('editGenre').value,
            duration: document.getElementById('editDuration').value
        };
        
        try {
            const response = await fetch(`${API_URL}/${songId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(songData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('Песня успешно обновлена!');
                editModal.classList.remove('show');
                loadSongs();
            } else {
                showError(result.error || 'Ошибка при обновлении песни');
            }
        } catch (error) {
            showError('Не удалось обновить песню');
        }
    });

    // Удалить песню (глобальная функция)
    window.deleteSong = async function(songId) {
        if (!confirm('Вы уверены, что хотите удалить эту песню?')) return;
        
        try {
            const response = await fetch(`${API_URL}/${songId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('Песня успешно удалена!');
                loadSongs();
            } else {
                showError(result.error || 'Ошибка при удалении песни');
            }
        } catch (error) {
            showError('Не удалось удалить песню');
        }
    };

    // Применить фильтры
    applyFilters.addEventListener('click', () => {
        const filters = {
            artist: searchArtist.value || undefined,
            genre: searchGenre.value || undefined,
            limit: limitResults.value || undefined
        };
        loadSongs(filters);
    });

    // Сбросить фильтры
    resetFilters.addEventListener('click', () => {
        searchArtist.value = '';
        searchGenre.value = '';
        limitResults.value = '';
        loadSongs();
    });

    // Закрыть модальное окно
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            editModal.classList.remove('show');
        });
    });

    // Уведомления
    function showSuccess(message) {
        showNotification(message, 'success');
    }

    function showError(message) {
        showNotification(message, 'error');
    }

    function showNotification(message, type) {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
        
        // Добавляем стили для анимации
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Загрузить песни при загрузке страницы
    loadSongs();
});