const API_BASE_URL = "http://localhost:8000";

function getAuthToken() {
    return localStorage.getItem('access_token');
}

function isAuthenticated() {
    return Boolean(getAuthToken());
}

function setAuthToken(token) {
    localStorage.setItem('access_token', token);
}

function removeAuthToken() {
    localStorage.removeItem('access_token');
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function requireAuth() {
    if (!isAuthenticated()) {
        redirectToLogin();
        return false;
    }
    return true;
}

function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return true;
    }
    return false;
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (response.status === 401) {
        removeAuthToken();
        redirectToLogin();
        throw new Error('Unauthorized');
    }

    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.detail || 'API Error');
    }

    return data;
}

function setupLogout() {
    const logoutLinks = document.querySelectorAll('#logoutLink');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            removeAuthToken();
            redirectToLogin();
        });
    });
}

document.addEventListener('DOMContentLoaded', setupLogout);
