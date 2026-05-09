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
        throw new Error(
            'Unable to connect to the server. Please check your internet connection and try again.'
        );
    }

    if (response.status === 401) {
        removeAuthToken();
        redirectToLogin();

        throw new Error(
            'Your session has expired. Please log in again to continue.'
        );
    }

    let data;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {

        const detail =
            typeof data?.detail === 'string'
                ? data.detail
                : '';

        if (detail) {
            throw new Error(detail);
        }

        if (response.status >= 500) {
            throw new Error(
                'Something went wrong on the server. Please try again after a few moments.'
            );
        }

        if (response.status === 404) {
            throw new Error(
                'The requested data could not be found. Please refresh the page or try again later.'
            );
        }

        if (response.status === 403) {
            throw new Error(
                'You do not have permission to perform this action. Please contact support if needed.'
            );
        }

        if (response.status === 400) {
            throw new Error(
                'Some information appears to be invalid. Please review your input and try again.'
            );
        }

        if (response.status === 429) {
            throw new Error(
                'Too many requests were made. Please wait a moment before trying again.'
            );
        }

        throw new Error(
            'Something unexpected happened. Please try again.'
        );
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

