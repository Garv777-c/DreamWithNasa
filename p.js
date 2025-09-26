// Dream with NASA Story Generator - Backend Functionality

class NASAStoryBackend {
  constructor() {
    this.apiKey = 'DEMO_KEY';
    this.baseURL = 'https://api.nasa.gov';
    this.imageAPI = 'https://images-api.nasa.gov';
    this.userHistory = this.loadUserHistory();
    this.favorites = this.loadFavorites();
    this.init();
  }

  // Initialize backend
  init() {
    this.setupEventListeners();
    this.loadUserPreferences();
    console.log('NASA Story Backend initialized');
  }

  // Setup event listeners
  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.displayWelcomeMessage();
      this.setupAutoSave();
    });
  }

  // Local Storage Management
  saveUserHistory(searchTerm, storyData) {
    this.userHistory = this.userHistory || [];
    const historyItem = {
      id: Date.now(),
      searchTerm: searchTerm,
      timestamp: new Date().toISOString(),
      storyTitle: storyData.name,
      date: new Date().toLocaleDateString()
    };
    
    this.userHistory.unshift(historyItem);
    if (this.userHistory.length > 10) {
      this.userHistory = this.userHistory.slice(0, 10);
    }
    
    localStorage.setItem('nasa_story_history', JSON.stringify(this.userHistory));
  }

  loadUserHistory() {
    const stored = localStorage.getItem('nasa_story_history');
    return stored ? JSON.parse(stored) : [];
  }

  // Favorites Management
  saveFavorite(storyData, images) {
    const favorite = {
      id: Date.now(),
      title: storyData.name,
      searchTerm: storyData.searchTerm || 'space',
      images: images.slice(0, 2), // Save first 2 images
      date: new Date().toLocaleDateString(),
      facts: storyData.storyFacts.slice(0, 3) // Save first 3 facts
    };
    
    this.favorites.unshift(favorite);
    if (this.favorites.length > 5) {
      this.favorites = this.favorites.slice(0, 5);
    }
    
    localStorage.setItem('nasa_story_favorites', JSON.stringify(this.favorites));
    this.showNotification('Story saved to favorites!');
  }

  loadFavorites() {
    const stored = localStorage.getItem('nasa_story_favorites');
    return stored ? JSON.parse(stored) : [];
  }

  // User Preferences
  saveUserPreferences(prefs) {
    localStorage.setItem('nasa_story_preferences', JSON.stringify(prefs));
  }

  loadUserPreferences() {
    const stored = localStorage.getItem('nasa_story_preferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      this.applyPreferences(prefs);
    }
  }

  applyPreferences(prefs) {
    if (prefs.fontSize) {
      document.body.style.fontSize = prefs.fontSize + 'px';
    }
    if (prefs.darkMode) {
      document.body.classList.toggle('dark-mode', prefs.darkMode);
    }
  }

  // Enhanced API Calls with Caching
  async fetchWithCache(url, cacheKey, expireMinutes = 30) {
    const cacheData = localStorage.getItem(cacheKey);
    if (cacheData) {
      const parsed = JSON.parse(cacheData);
      const now = new Date().getTime();
      if (now - parsed.timestamp < expireMinutes * 60 * 1000) {
        return parsed.data;
      }
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      localStorage.setItem(cacheKey, JSON.stringify({
        data: data,
        timestamp: new Date().getTime()
      }));
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  }

  // Enhanced NASA Image Search
  async searchNASAImages(query, count = 6) {
    const cacheKey = `nasa_images_${query}_${count}`;
    const searchQueries = [query, `${query} space`, `${query} astronomy`, `${query} NASA`];
    const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    
    const url = `${this.imageAPI}/search?q=${encodeURIComponent(randomQuery)}&media_type=image&page_size=50`;
    const data = await this.fetchWithCache(url, cacheKey, 60);
    
    if (data && data.collection && data.collection.items) {
      const items = data.collection.items
        .filter(item => item.links && item.data && item.data[0])
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
        
      return items.map(item => ({
        url: item.links[0].href,
        title: item.data[0].title || 'NASA Discovery',
        description: (item.data[0].description || 'Space exploration image').substring(0, 120),
        date: item.data[0].date_created ? new Date(item.data[0].date_created).toLocaleDateString() : 'Unknown',
        id: item.data[0].nasa_id || `img_${Date.now()}_${Math.random()}`
      }));
    }
    return null;
  }

  // User Progress Tracking
  trackQuizProgress(topic, score, totalQuestions) {
    const progress = this.loadProgress();
    progress[topic] = {
      bestScore: Math.max(progress[topic]?.bestScore || 0, score),
      totalAttempts: (progress[topic]?.totalAttempts || 0) + 1,
      lastAttempt: new Date().toISOString(),
      accuracy: Math.round((score / totalQuestions) * 100)
    };
    
    localStorage.setItem('nasa_quiz_progress', JSON.stringify(progress));
    return progress[topic];
  }

  loadProgress() {
    const stored = localStorage.getItem('nasa_quiz_progress');
    return stored ? JSON.parse(stored) : {};
  }

  // Statistics and Analytics
  generateUserStats() {
    const history = this.loadUserHistory();
    const progress = this.loadProgress();
    const favorites = this.loadFavorites();
    
    return {
      totalStories: history.length,
      totalQuizzes: Object.values(progress).reduce((sum, p) => sum + p.totalAttempts, 0),
      favoriteStories: favorites.length,
      averageScore: this.calculateAverageScore(progress),
      mostSearchedTopic: this.getMostSearchedTopic(history),
      joinDate: this.getJoinDate()
    };
  }

  calculateAverageScore(progress) {
    const scores = Object.values(progress).map(p => p.accuracy);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  getMostSearchedTopic(history) {
    const topicCounts = {};
    history.forEach(item => {
      const topic = item.searchTerm.toLowerCase();
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
    
    return Object.keys(topicCounts).reduce((a, b) => 
      topicCounts[a] > topicCounts[b] ? a : b, 'space');
  }

  getJoinDate() {
    let joinDate = localStorage.getItem('nasa_join_date');
    if (!joinDate) {
      joinDate = new Date().toISOString();
      localStorage.setItem('nasa_join_date', joinDate);
    }
    return new Date(joinDate).toLocaleDateString();
  }

  // Auto-save functionality
  setupAutoSave() {
    setInterval(() => {
      const currentContent = document.getElementById('results')?.innerHTML;
      if (currentContent && currentContent.length > 100) {
        localStorage.setItem('nasa_last_session', currentContent);
        localStorage.setItem('nasa_last_session_time', new Date().toISOString());
      }
    }, 30000); // Save every 30 seconds
  }

  // Restore last session
  restoreLastSession() {
    const lastSession = localStorage.getItem('nasa_last_session');
    const lastTime = localStorage.getItem('nasa_last_session_time');
    
    if (lastSession && lastTime) {
      const timeDiff = new Date() - new Date(lastTime);
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) { // Restore if less than 24 hours old
        return {
          content: lastSession,
          time: new Date(lastTime).toLocaleString()
        };
      }
    }
    return null;
  }

  // User Dashboard
  showUserDashboard() {
    const stats = this.generateUserStats();
    const history = this.loadUserHistory();
    const favorites = this.loadFavorites();
    
    const dashboardHTML = `
      <div class="results">
        <div class="story-section">
          <h2>Your Space Explorer Dashboard</h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
              <h3 style="color: #000; margin-bottom: 10px;">Stories Created</h3>
              <p style="font-size: 24px; font-weight: bold; color: #000;">${stats.totalStories}</p>
            </div>
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
              <h3 style="color: #000; margin-bottom: 10px;">Quizzes Taken</h3>
              <p style="font-size: 24px; font-weight: bold; color: #000;">${stats.totalQuizzes}</p>
            </div>
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
              <h3 style="color: #000; margin-bottom: 10px;">Average Score</h3>
              <p style="font-size: 24px; font-weight: bold; color: #000;">${stats.averageScore}%</p>
            </div>
            <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
              <h3 style="color: #000; margin-bottom: 10px;">Member Since</h3>
              <p style="font-size: 16px; font-weight: bold; color: #000;">${stats.joinDate}</p>
            </div>
          </div>

          ${history.length > 0 ? `
            <h3 style="color: #000; margin: 25px 0 15px;">Recent Stories</h3>
            <div style="max-height: 200px; overflow-y: auto;">
              ${history.slice(0, 5).map(item => `
                <div style="background: #f8f9fa; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #333;">
                  <strong style="color: #000;">${item.storyTitle}</strong><br>
                  <small style="color: #666;">Searched: "${item.searchTerm}" on ${item.date}</small>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${favorites.length > 0 ? `
            <h3 style="color: #000; margin: 25px 0 15px;">Favorite Stories</h3>
            <div style="max-height: 200px; overflow-y: auto;">
              ${favorites.map(fav => `
                <div style="background: #fff3cd; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #ffc107;">
                  <strong style="color: #000;">${fav.title}</strong><br>
                  <small style="color: #666;">Saved on ${fav.date}</small>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 25px;">
            <button class="search-btn" onclick="nasaBackend.clearAllData()" style="background: #dc3545; margin: 5px;">
              Clear All Data
            </button>
            <button class="search-btn" onclick="document.getElementById('results').innerHTML=''; document.getElementById('searchInput').focus();" style="margin: 5px;">
              Back to Stories
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('results').innerHTML = dashboardHTML;
  }

  // Notifications
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
      color: #000;
      padding: 15px 20px;
      border-radius: 6px;
      border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 1000;
      font-weight: 600;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Clear all user data
  clearAllData() {
    if (confirm('Are you sure you want to clear all your data? This cannot be undone.')) {
      localStorage.removeItem('nasa_story_history');
      localStorage.removeItem('nasa_story_favorites');
      localStorage.removeItem('nasa_quiz_progress');
      localStorage.removeItem('nasa_story_preferences');
      localStorage.removeItem('nasa_last_session');
      
      this.userHistory = [];
      this.favorites = [];
      
      this.showNotification('All data cleared successfully!');
      
      setTimeout(() => {
        document.getElementById('results').innerHTML = '';
        document.getElementById('searchInput').focus();
      }, 2000);
    }
  }

  // Display welcome message for new users
  displayWelcomeMessage() {
    const isNewUser = !localStorage.getItem('nasa_join_date');
    if (isNewUser) {
      setTimeout(() => {
        this.showNotification('Welcome to NASA Story Generator! Your progress will be automatically saved.', 'success');
      }, 1000);
    }
  }

  // Export user data
  exportUserData() {
    const userData = {
      history: this.userHistory,
      favorites: this.favorites,
      progress: this.loadProgress(),
      joinDate: this.getJoinDate(),
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `nasa_story_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.showNotification('Data exported successfully!');
  }

  // Enhanced error handling
  handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    const errorLog = this.loadErrorLog();
    errorLog.push({
      error: error.message,
      context: context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    if (errorLog.length > 20) {
      errorLog.splice(0, errorLog.length - 20);
    }
    
    localStorage.setItem('nasa_error_log', JSON.stringify(errorLog));
  }

  loadErrorLog() {
    const stored = localStorage.getItem('nasa_error_log');
    return stored ? JSON.parse(stored) : [];
  }

  // Performance monitoring
  measurePerformance(operation, func) {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    
    console.log(`${operation} took ${(end - start).toFixed(2)} milliseconds`);
    return result;
  }

  // Offline functionality
  isOnline() {
    return navigator.onLine;
  }

  setupOfflineHandling() {
    window.addEventListener('online', () => {
      this.showNotification('Connection restored! NASA data available again.');
    });
    
    window.addEventListener('offline', () => {
      this.showNotification('You are offline. Showing cached data.', 'error');
    });
  }
}

// Enhanced Functions for the main application
function enhanceStoryGeneration() {
  // Add to existing generateStory function
  window.originalGenerateStory = window.generateStory;
  
  window.generateStory = async function() {
    const searchTerm = document.getElementById('searchInput').value.trim() || 'space';
    
    // Track the search
    if (window.nasaBackend) {
      nasaBackend.saveUserHistory(searchTerm, { name: `${searchTerm} exploration` });
    }
    
    // Call original function
    await window.originalGenerateStory();
  };
}

// Enhanced Quiz System
function enhanceQuizSystem() {
  window.originalStartQuiz = window.startQuiz;
  
  window.startQuiz = function(searchTerm) {
    console.log('Starting enhanced quiz for:', searchTerm);
    return window.originalStartQuiz(searchTerm);
  };
}

// Add dashboard functionality
function addDashboardButton() {
  setTimeout(() => {
    const container = document.querySelector('.container');
    if (container && !document.getElementById('dashboardBtn')) {
      const dashboardBtn = document.createElement('button');
      dashboardBtn.id = 'dashboardBtn';
      dashboardBtn.className = 'puzzle-btn';
      dashboardBtn.textContent = 'My Dashboard';
      dashboardBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 100; padding: 10px 15px; font-size: 14px;';
      dashboardBtn.onclick = () => window.nasaBackend.showUserDashboard();
      
      document.body.appendChild(dashboardBtn);
    }
  }, 2000);
}

// Add favorite functionality to stories
function addFavoriteButton(storyData, images) {
  return `
    <button class="search-btn" onclick="nasaBackend.saveFavorite(${JSON.stringify(storyData).replace(/"/g, '&quot;')}, ${JSON.stringify(images).replace(/"/g, '&quot;')})" 
            style="background: #ffc107; color: #000; margin: 5px; font-size: 14px; padding: 8px 16px;">
      Save Favorite
    </button>
  `;
}

// CSS Animations for notifications
const style = document.createElement('style');
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

// Initialize backend when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.nasaBackend = new NASAStoryBackend();
  enhanceStoryGeneration();
  enhanceQuizSystem();
  addDashboardButton();
  
  console.log('NASA Story Generator Backend loaded successfully!');
});

// Global utility functions
window.NASAUtils = {
  formatDate: (dateString) => new Date(dateString).toLocaleDateString(),
  truncateText: (text, length = 100) => text.length > length ? text.substring(0, length) + '...' : text,
  generateId: () => Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  downloadData: (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
