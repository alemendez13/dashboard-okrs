// =================================================================================
// === 1. CONFIGURACIÓN Y ESTADO GLOBAL ===
// =================================================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwe-u3L7Vv6Q3yO8i2_eYc-U29oN2L8F77hPIMY3k-0_V1rO2U7Bf3U2P2/exec';

// --- Elementos del DOM ---
const mainContent = document.getElementById('main-content');
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const viewTitle = document.getElementById('view-title');
const loader = document.getElementById('loader');
const userPill = document.getElementById('user-pill');
const frequencyFilterContainer = document.getElementById('frequency-filter');

// --- Estado de la aplicación ---
let appData = {};
let currentUserId = null;
let isAdmin = false;
let currentFrequency = 'mensual'; // Frecuencia por defecto
let currentRenderFunction = () => {}; // Almacena la función de la vista actual para re-renderizar

// =================================================================================
// === 2. INICIALIZACIÓN Y FLUJO PRINCIPAL ===
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Revisar si hay un usuario en sessionStorage para mantener la sesión
    const storedUserId = sessionStorage.getItem('currentUserId');
    if (storedUserId) {
        showLoader();
        currentUserId = parseInt(storedUserId, 10);
        fetchDataAndInitialize();
    } else {
        // Si no hay sesión, solo mostramos la vista de login
        showLoginView();
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function fetchDataAndInitialize() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const rawData = await response.json();
        
        // Procesar los datos una vez para optimizar
        appData = processData(rawData);
        
        initializeApp();
    } catch (error) {
        console.error('Error fetching data:', error);
        showLoginView(); // Si falla, volver al login
        loginError.textContent = 'No se pudo cargar la información. Intenta de nuevo.';
        loginError.classList.remove('hidden');
    }
}

function initializeApp() {
    setupEventListeners();
    updateUserContext();
    
    // Vista y frecuencia iniciales
    currentRenderFunction = renderDashboard;
    currentRenderFunction();

    setActiveNav('nav-dashboard');
    setActiveFrequency(currentFrequency);
    showAppView();
}

function setupEventListeners() {
    const navLinks = {
        'nav-dashboard': renderDashboard,
        'nav-tactical': renderTacticalView,
        'nav-personal': renderPersonalView,
        'nav-admin': renderAdminView
    };

    Object.keys(navLinks).forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            e.preventDefault();
            currentRenderFunction = navLinks[id];
            currentRenderFunction();
            setActiveNav(id);
        });
    });

    frequencyFilterContainer.querySelectorAll('.freq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFrequency = btn.dataset.freq;
            setActiveFrequency(currentFrequency);
            // Re-renderizar la vista actual con la nueva frecuencia
            if (typeof currentRenderFunction === 'function') {
                currentRenderFunction();
            }
        });
    });
}

// =================================================================================
// === 3. MANEJO DE AUTENTICACIÓN Y CONTEXTO DE USUARIO ===
// =================================================================================

async function handleLogin(event) {
    event.preventDefault();
    showLoader();
    loginError.classList.add('hidden');

    // Se re-fetchan los datos en cada intento de login para seguridad
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error de conexión.');
        const rawData = await response.json();
        appData = processData(rawData); // Procesar datos frescos

        const email = event.target.email.value;
        const password = event.target.password.value;
        const user = appData.users.find(u => u.Email === email && u.Contraseña === password);

        if (user) {
            currentUserId = user.ID_Usuario;
            sessionStorage.setItem('currentUserId', currentUserId); // Guardar sesión
            initializeApp();
        } else {
            loginError.textContent = 'Email o contraseña incorrectos.';
            loginError.classList.remove('hidden');
            showLoginView();
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Error de conexión. Verifica tu red.';
        loginError.classList.remove('hidden');
        showLoginView();
    }
}

function handleLogout() {
    sessionStorage.removeItem('currentUserId');
    currentUserId = null;
    isAdmin = false;
    appData = {};
    showLoginView();
    // Ocultar el link de admin al cerrar sesión
    document.getElementById('nav-admin')?.classList.add('hidden');
}

function updateUserContext() {
    if (!currentUserId || !appData.users) return;
    const currentUser = appData.users.find(u => u.ID_Usuario === currentUserId);
    if (currentUser) {
        isAdmin = currentUser.Rol && currentUser.Rol.toLowerCase() === 'admin';
        userPill.innerHTML = `
            <div class="ml-3">
                <p class="text-sm font-semibold text-gray-800">${currentUser.Nombre_Completo}</p>
                <a href="#" id="logout-link" class="text-xs text-gray-500 hover:text-sky-600">Cerrar sesión</a>
            </div>`;
        document.getElementById('logout-link').addEventListener('click', handleLogout);

        // Mostrar/Ocultar el link de Admin según el rol
        document.getElementById('nav-admin')?.classList.toggle('hidden', !isAdmin);
    }
}

// =================================================================================
// === 4. LÓGICA DE PROCESAMIENTO Y FILTRADO DE DATOS ===
// =================================================================================

function processData(data) {
    // Convertir fechas en el array de resultados para facilitar el filtrado
    if (data.results) {
        data.results.forEach(r => {
            r.Fecha = new Date(r.Fecha);
        });
    }
    return data;
}

function getFilteredData() {
    const { kpis, results } = appData;
    
    // 1. CORRECCIÓN: Filtrar KPIs asegurando que la propiedad 'Frecuencia' existe.
    const filteredKpis = kpis.filter(k => 
        k.Frecuencia && typeof k.Frecuencia === 'string' && k.Frecuencia.toLowerCase() === currentFrequency
    );
    
    // 2. Filtrar Resultados por rango de fecha según la frecuencia
    let filteredResults;
    const now = new Date();

    if (currentFrequency === 'semanal') {
        const startOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio de semana
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        filteredResults = results.filter(r => r.Fecha >= startOfWeek && r.Fecha <= endOfWeek);
    } else if (currentFrequency === 'mensual') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        filteredResults = results.filter(r => r.Fecha >= startOfMonth && r.Fecha <= endOfMonth);
    } else { // anual
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        filteredResults = results.filter(r => r.Fecha >= startOfYear && r.Fecha <= endOfYear);
    }
    
    return { filteredKpis, filteredResults };
}

function calculateKpiMetrics(kpi, allResults) {
    const relevantResults = allResults.filter(r => r.ID_KPI === kpi.ID_KPI);
    if (relevantResults.length === 0) {
        return { currentValue: 0, progress: 0 };
    }

    let currentValue;
    // CORRECCIÓN: Asegurar que 'Metodo_Agregacion' existe antes de usarlo.
    if (kpi.Metodo_Agregacion && kpi.Metodo_Agregacion.toLowerCase() === 'sumar') {
        currentValue = relevantResults.reduce((sum, r) => sum + parseFloat(r.Valor || 0), 0);
    } else { // Promediar o cualquier otro caso por defecto
        const sum = relevantResults.reduce((sum, r) => sum + parseFloat(r.Valor || 0), 0);
        currentValue = sum / relevantResults.length;
    }
    
    const meta = parseFloat(kpi.Meta);
    const progress = (meta > 0) ? (currentValue / meta) : 0;
    
    return { currentValue, progress };
}


// =================================================================================
// === 5. RENDERIZADO DE VISTAS Y COMPONENTES ===
// =================================================================================

function renderDashboard() {
    viewTitle.textContent = 'Dashboard General';
    const { filteredKpis, filteredResults } = getFilteredData();
    let content = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
    
    if (filteredKpis.length > 0) {
        filteredKpis.forEach(kpi => {
            const metrics = calculateKpiMetrics(kpi, filteredResults);
            content += createKpiCardHTML(kpi, metrics);
        });
    } else {
        content += '<p class="col-span-full text-gray-500">No hay KPIs para la frecuencia seleccionada.</p>';
    }

    content += '</div>';
    mainContent.innerHTML = content;
}

function renderTacticalView() {
    viewTitle.textContent = 'Vista Táctica por Objetivo';
    const { objectives, keyResults } = appData;
    const { filteredKpis, filteredResults } = getFilteredData();
    let content = '<div class="space-y-8">';

    objectives.forEach(obj => {
        content += `<div class="bg-white p-6 rounded-lg shadow-sm">
            <h3 class="text-lg font-bold text-gray-800 mb-4">${obj.Nombre_Objetivo}</h3>
            <div class="space-y-4">`;
        
        const relatedKeyResults = keyResults.filter(kr => kr.ID_Objetivo_Asociado === obj.ID_Objetivo);
        relatedKeyResults.forEach(kr => {
            content += `<div class="pl-4 border-l-2 border-sky-200">
                <h4 class="font-semibold text-gray-700">${kr.Nombre_Resultado_Clave}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">`;
            
            const relatedKpis = filteredKpis.filter(k => k.ID_Resultado_Clave === kr.ID_Resultado_Clave);
            if(relatedKpis.length > 0) {
                relatedKpis.forEach(kpi => {
                    const metrics = calculateKpiMetrics(kpi, filteredResults);
                    content += createKpiCardHTML(kpi, metrics, true); // small variant
                });
            } else {
                content += '<p class="col-span-full text-sm text-gray-400">Sin KPIs para esta frecuencia.</p>';
            }
            content += `</div></div>`;
        });
        content += '</div></div>';
    });

    content += '</div>';
    mainContent.innerHTML = content;
}

function renderPersonalView() {
    viewTitle.textContent = 'Mi Tablero Personal';
    const { filteredKpis, filteredResults } = getFilteredData();
    const myKpis = filteredKpis.filter(kpi => kpi.ID_Usuario_Res === currentUserId);
    
    let content = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
    if (myKpis.length > 0) {
        myKpis.forEach(kpi => {
            const metrics = calculateKpiMetrics(kpi, filteredResults);
            content += createKpiCardHTML(kpi, metrics);
        });
    } else {
        content += '<p class="col-span-full text-gray-500">No tienes KPIs asignados para la frecuencia seleccionada.</p>';
    }

    content += '</div>';
    mainContent.innerHTML = content;
}

function renderAdminView() {
    viewTitle.textContent = 'Administración de Desempeño';
    if (!isAdmin) {
        mainContent.innerHTML = '<p class="text-red-500">Acceso denegado. Esta sección es solo para administradores.</p>';
        return;
    }
    
    const { users } = appData;
    let options = users.map(u => `<option value="${u.ID_Usuario}">${u.Nombre_Completo}</option>`).join('');
    
    mainContent.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-sm">
            <label for="user-selector" class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Usuario:</label>
            <select id="user-selector" class="admin-select block w-full max-w-sm bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500">
                <option value="">-- Todos los usuarios --</option>
                ${options}
            </select>
        </div>
        <div id="admin-kpi-list" class="mt-6">
            <p class="text-gray-500">Selecciona un usuario para ver sus KPIs asignados para la frecuencia de <strong>${currentFrequency}</strong>.</p>
        </div>
    `;

    document.getElementById('user-selector').addEventListener('change', (e) => {
        renderAdminKpiList(parseInt(e.target.value, 10));
    });
}

function renderAdminKpiList(selectedUserId) {
    const listContainer = document.getElementById('admin-kpi-list');
    if (!selectedUserId) {
        listContainer.innerHTML = `<p class="text-gray-500">Selecciona un usuario para ver sus KPIs asignados para la frecuencia de <strong>${currentFrequency}</strong>.</p>`;
        return;
    }
    
    const { filteredKpis, filteredResults } = getFilteredData();
    const userKpis = filteredKpis.filter(kpi => kpi.ID_Usuario_Res === selectedUserId);
    
    let content = `<h3 class="text-lg font-semibold mb-4">KPIs de ${appData.users.find(u => u.ID_Usuario === selectedUserId).Nombre_Completo}</h3>`;
    content += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
    
    if (userKpis.length > 0) {
        userKpis.forEach(kpi => {
            const metrics = calculateKpiMetrics(kpi, filteredResults);
            content += createKpiCardHTML(kpi, metrics);
        });
    } else {
        content += `<p class="col-span-full text-gray-500">Este usuario no tiene KPIs para la frecuencia de <strong>${currentFrequency}</strong>.</p>`;
    }
    content += '</div>';
    listContainer.innerHTML = content;
}

// --- Componentes de UI reutilizables ---
function createKpiCardHTML(kpi, metrics, isSmall = false) {
    const { currentValue, progress } = metrics;
    const progressPercent = Math.min(Math.max(progress * 100, 0), 100);
    
    let progressBarColorClass = 'progress-bar-red';
    if (progressPercent >= 85) progressBarColorClass = 'progress-bar-green';
    else if (progressPercent >= 50) progressBarColorClass = 'progress-bar-yellow';

    const formattedValue = formatValue(currentValue, kpi.Unidad);
    const formattedMeta = formatValue(kpi.Meta, kpi.Unidad);
    
    if (isSmall) {
        return `
            <div class="kpi-card bg-gray-50 p-3 rounded-md border border-gray-200">
                <p class="text-sm font-medium text-gray-700 truncate">${kpi.Nombre_KPI}</p>
                <div class="flex items-baseline justify-between mt-1">
                    <span class="text-lg font-bold text-sky-600">${formattedValue}</span>
                    <span class="text-xs text-gray-500">/ ${formattedMeta}</span>
                </div>
                <div class="progress-bar-bg mt-2 h-1.5 w-full"><div class="${progressBarColorClass} progress-bar" style="width: ${progressPercent}%"></div></div>
            </div>`;
    }

    return `
        <div class="kpi-card bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
            <div>
                <p class="text-sm text-gray-500">${appData.users.find(u => u.ID_Usuario === kpi.ID_Usuario_Res)?.Nombre_Completo || 'N/A'}</p>
                <p class="font-semibold text-gray-800 mt-1">${kpi.Nombre_KPI}</p>
            </div>
            <div class="mt-4">
                <div class="flex items-baseline justify-between">
                    <span class="text-2xl font-bold text-sky-700">${formattedValue}</span>
                    <span class="text-sm font-medium text-gray-500">${progressPercent.toFixed(0)}%</span>
                </div>
                <p class="text-sm text-gray-400 mt-1">Meta: ${formattedMeta}</p>
                <div class="progress-bar-bg mt-3 h-2 w-full"><div class="${progressBarColorClass} progress-bar" style="width: ${progressPercent}%"></div></div>
            </div>
        </div>`;
}

// =================================================================================
// === 6. FUNCIONES UTILITARIAS ===
// =================================================================================

function showLoader() { loader.style.display = 'flex'; }
function hideLoader() { loader.style.display = 'none'; }

function showLoginView() {
    hideLoader();
    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
}

function showAppView() {
    hideLoader();
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    appView.style.display = 'flex';
}

function setActiveNav(id) {
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active-nav'));
    document.getElementById(id)?.classList.add('active-nav');
}

function setActiveFrequency(freq) {
    frequencyFilterContainer.querySelectorAll('.freq-btn').forEach(btn => {
        btn.classList.toggle('active-freq', btn.dataset.freq === freq);
    });
}

function formatValue(value, unit) {
    if (unit === '$') {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
    }
    if (unit === '%') {
        // Asumiendo que el valor ya está en decimal (e.g., 0.9 para 90%)
        return `${((value || 0) * 100).toFixed(0)}%`;
    }
    return (value || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 });
}

