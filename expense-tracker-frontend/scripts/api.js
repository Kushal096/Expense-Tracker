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

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    } catch {
        throw new Error('Network error. Unable to reach the server.');
    }
    
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
        const detail = typeof data?.detail === 'string' ? data.detail : '';

        if (detail) {
            throw new Error(detail);
        }

        if (response.status >= 500) {
            throw new Error('Server error. Please try again in a moment.');
        }

        if (response.status === 404) {
            throw new Error('Requested resource was not found.');
        }

        if (response.status === 403) {
            throw new Error('You do not have permission to perform this action.');
        }

        if (response.status === 400) {
            throw new Error('Invalid request. Please review your input and try again.');
        }

        throw new Error('Request failed. Please try again.');
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
