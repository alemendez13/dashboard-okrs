// =================================================================================
// === 1. CONFIGURACIÓN Y ESTADO GLOBAL ===
// =================================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbwe-u3L7Vv6Q3yO8i2_eYc-U29oN2L8F77hPIMY3k-0_V1rO2U7Bf3U2P2/exec';

// Elementos del DOM
const mainContent = document.getElementById('main-content');
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const viewTitle = document.getElementById('view-title');
const loader = document.getElementById('loader');
const frequencyFilter = document.getElementById('frequency-filter');

// Estado de la aplicación
let appData = {};
let currentUserId = null;
let isAdmin = false;
let currentFrequency = 'mensual'; // Frecuencia por defecto
let currentRenderFunction = () => {}; // Función de la vista actual para re-renderizar

// =================================================================================
// === 2. INICIALIZACIÓN Y FLUJO PRINCIPAL ===
// =================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    showLoader();
    // 1. SIEMPRE se cargan los datos primero para que estén disponibles.
    await fetchData();

    // 2. Se asocia el evento al formulario de login.
    loginForm.addEventListener('submit', handleLogin);

    // 3. Se comprueba si ya existe una sesión.
    const storedUserId = localStorage.getItem('currentUserId');
    if (storedUserId) {
        currentUserId = parseInt(storedUserId, 10);
        // El resto de la app se inicializa de forma segura.
        initializeApp().catch(console.error);
    } else {
        // Si no hay sesión, simplemente se muestra la vista de login.
        showLoginView();
    }
});


// =================================================================================
// === 2. INICIALIZACIÓN Y FLUJO PRINCIPAL ===
// =================================================================================

// La función initializeApp ahora es global y puede ser llamada desde cualquier lugar.
async function initializeApp() {
    setupEventListeners();
    updateUserContext();
    
    currentRenderFunction = renderDashboard;
    currentRenderFunction();

    setActiveNav('nav-dashboard');
    setActiveFrequency(currentFrequency);
    showAppView();
}

document.addEventListener('DOMContentLoaded', async () => {
    showLoader();
    // 1. Siempre se cargan los datos primero.
    await fetchData();

    // 2. Se asocia el evento al formulario.
    loginForm.addEventListener('submit', handleLogin);

    // 3. Se comprueba si ya existe una sesión guardada.
    const storedUserId = localStorage.getItem('currentUserId');
    if (storedUserId) {
        currentUserId = parseInt(storedUserId, 10);
        // Se llama a la función global para iniciar la app.
        await initializeApp();
    } else {
        // Si no hay sesión, simplemente se muestra la vista de login.
        showLoginView();
    }
});

// =================================================================================
// === 3. MANEJO DE DATOS (API Y PROCESAMIENTO) ===
// =================================================================================

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const rawData = await response.json();
        
        // Limpieza y pre-procesamiento de datos
        appData = {
            users: rawData.users.filter(u => u.ID_Usuario) || [],
            objectives: rawData.objectives || [],
            keyResults: rawData.keyResults || [],
            processes: rawData.processes || [],
            kpis: (rawData.kpis || []).map(k => ({
                ...k,
                Meta: parseFloat(k.Meta) || 0,
                Es_Financiero: String(k.Es_Financiero).toUpperCase() === 'VERDADERO',
            })),
            results: (rawData.results || []).map(r => ({
                ...r,
                Fecha: new Date(r.Fecha),
                Valor: parseFloat(r.Valor) || 0,
            })),
        };
    } catch (error) {
        console.error("Falló la obtención de datos:", error);
        mainContent.innerHTML = `<p class="text-red-500">No se pudieron cargar los datos.</p>`;
    }
}

/**
 * Calcula el progreso para todos los elementos basado en la frecuencia actual.
 */
function processProgress(frequency) {
    if (!appData.kpis) return;

    appData.kpis.forEach(kpi => {
        const relevantResults = getResultsByFrequency(kpi.ID_KPI, frequency);
        let currentValue = 0;
        const aggregation = kpi.Metodo_Agregacion.toUpperCase();

        if (aggregation === 'SUMAR') {
            currentValue = relevantResults.reduce((sum, r) => sum + r.Valor, 0);
        } else if (aggregation === 'PROMEDIAR') {
            currentValue = relevantResults.length > 0
                ? relevantResults.reduce((sum, r) => sum + r.Valor, 0) / relevantResults.length
                : 0;
        } else { // 'ULTIMO' o por defecto
            currentValue = (relevantResults[0] || { Valor: 0 }).Valor;
        }
        
        // Si la frecuencia es semanal y no hay datos, el valor es 0, como solicitaste.
        if (frequency === 'semanal' && relevantResults.length === 0) {
            currentValue = 0;
        }

        kpi.progressData = {
            currentValue,
            progress: kpi.Meta > 0 ? Math.min((currentValue / kpi.Meta) * 100, 100) : 0
        };
    });

    appData.keyResults.forEach(kr => {
        const childKpis = appData.kpis.filter(kpi => kpi.ID_Resultado_Clave === kr.ID_Resultado_Clave);
        kr.progress = childKpis.length > 0
            ? childKpis.reduce((sum, kpi) => sum + (kpi.progressData.progress || 0), 0) / childKpis.length
            : 0;
    });

    appData.objectives.forEach(obj => {
        const childKrs = appData.keyResults.filter(kr => kr.ID_Objetivo_Asociado === obj.ID_Objetivo);
        obj.progress = childKrs.length > 0
            ? childKrs.reduce((sum, kr) => sum + (kr.progress || 0), 0) / childKrs.length
            : 0;
    });
}

// =================================================================================
// === 4. FUNCIONES DE RENDERIZADO (VISTAS) ===
// =================================================================================

function renderDashboard() {
    viewTitle.textContent = 'Dashboard Estratégico';
    processProgress(currentFrequency);

    const objectivesHtml = appData.objectives.map(obj => {
        const keyResults = appData.keyResults.filter(kr => kr.ID_Objetivo_Asociado === obj.ID_Objetivo);
        const progress = obj.progress || 0;
        return `
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
                 <div class="p-5">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-800">${obj.Nombre_Objetivo}</h3>
                        <div class="flex items-center gap-4">
                            <div class="w-40">
                                <div class="flex justify-between items-center mb-1"><span class="text-xs font-medium text-sky-700">Progreso</span><span class="text-xs font-bold text-sky-700">${progress.toFixed(1)}%</span></div>
                                <div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-sky-500 h-2 rounded-full" style="width: ${progress.toFixed(1)}%"></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    mainContent.innerHTML = `<div class="space-y-4">${objectivesHtml}</div>`;
}

function renderTacticalView() {
    viewTitle.textContent = 'Vista Táctica (Procesos)';
    processProgress(currentFrequency);

    const processesHtml = appData.processes.map(proc => {
        const kpisInProcess = appData.kpis.filter(kpi => kpi.ID_Proceso_Asc === proc.ID_Proceso);
        if (kpisInProcess.length === 0) return '';
        
        const kpisHtml = kpisInProcess.map(kpi => {
            const data = kpi.progressData;
            const meta = kpi.Meta;
            return `
                <div class="flex justify-between items-center py-2 border-b">
                    <span class="text-gray-700">${kpi.Nombre_KPI}</span>
                    <span class="font-semibold">${formatValue(data.currentValue, kpi.Unidad)} / ${formatValue(meta, kpi.Unidad)}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="bg-white rounded-xl border p-5">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">${proc.Nombre_Proceso}</h3>
                <div class="space-y-2">${kpisHtml}</div>
            </div>
        `;
    }).join('');

    mainContent.innerHTML = `<div class="space-y-4">${processesHtml}</div>`;
}

function renderPersonalView() {
    viewTitle.textContent = 'Mi Tablero Personal';
    processProgress(currentFrequency);
    
    const userKpis = appData.kpis.filter(kpi => kpi.ID_Usuario_Res === currentUserId);

    if (userKpis.length === 0) {
        mainContent.innerHTML = `<div class="text-center p-10 bg-white rounded-lg border"><p class="text-gray-500">No tienes KPIs asignados.</p></div>`;
        return;
    }

    const kpisHtml = userKpis.map(kpi => {
        const data = kpi.progressData;
        return `
            <div class="bg-white rounded-lg shadow-md p-4">
                <p class="font-semibold text-gray-700">${kpi.Nombre_KPI}</p>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div class="bg-teal-500 h-2.5 rounded-full" style="width: ${data.progress.toFixed(1)}%"></div>
                </div>
                <p class="text-right text-sm text-gray-600 mt-1">
                    ${formatValue(data.currentValue, kpi.Unidad)} de ${formatValue(kpi.Meta, kpi.Unidad)}
                </p>
            </div>
        `;
    }).join('');

    mainContent.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${kpisHtml}</div>`;
}

function renderAdminView() {
    viewTitle.textContent = 'Administración';
    if (!isAdmin) {
        mainContent.innerHTML = `<p>Acceso denegado.</p>`;
        return;
    }
    
    const userOptions = appData.users.map(u => `<option value="${u.ID_Usuario}">${u.Nombre_Completo}</option>`).join('');

    mainContent.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-bold mb-4">Ver KPIs por Usuario</h3>
            <div class="flex items-center space-x-4">
                 <label for="user-selector" class="text-sm font-medium">Seleccionar usuario:</label>
                 <select id="user-selector" class="border-gray-300 rounded-md shadow-sm">
                    <option value="">-- Elige un usuario --</option>
                    ${userOptions}
                 </select>
            </div>
            <div id="admin-kpi-list" class="mt-6"></div>
        </div>
    `;

    document.getElementById('user-selector').addEventListener('change', (e) => {
        const selectedUserId = parseInt(e.target.value, 10);
        const kpiListContainer = document.getElementById('admin-kpi-list');

        if (!selectedUserId) {
            kpiListContainer.innerHTML = '';
            return;
        }
        
        processProgress(currentFrequency);
        const userKpis = appData.kpis.filter(kpi => kpi.ID_Usuario_Res === selectedUserId);
        
        if (userKpis.length === 0) {
            kpiListContainer.innerHTML = `<p class="text-gray-500 mt-4">Este usuario no tiene KPIs asignados.</p>`;
            return;
        }

        const kpisHtml = userKpis.map(kpi => {
            return `
                <div class="flex justify-between py-2 border-b">
                    <span>${kpi.Nombre_KPI}</span>
                    <span class="font-medium">${formatValue(kpi.progressData.currentValue, kpi.Unidad)}</span>
                </div>
            `;
        }).join('');

        kpiListContainer.innerHTML = `<div class="space-y-2">${kpisHtml}</div>`;
    });
}


// =================================================================================
// === 5. MANEJADORES DE EVENTOS Y UTILIDADES ===
// =================================================================================

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const user = appData.users.find(u => u.Email === email && u.Contraseña === password);

    if (user) {
        currentUserId = user.ID_Usuario;
        localStorage.setItem('currentUserId', currentUserId);
        initializeApp().catch(console.error);
    } else {
        document.getElementById('error-message').textContent = 'Credenciales incorrectas.';
    }
}

function handleLogout() {
    currentUserId = null;
    localStorage.removeItem('currentUserId');
    showLoginView();
}

function setupEventListeners() {
    const navLinks = {
        'nav-dashboard': renderDashboard,
        'nav-tactical': renderTacticalView,
        'nav-personal': renderPersonalView,
        'nav-admin': renderAdminView
    };

    Object.keys(navLinks).forEach(id => {
        const link = document.getElementById(id);
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                currentRenderFunction = navLinks[id];
                currentRenderFunction();
                setActiveNav(id);
            });
        }
    });

    frequencyFilter.addEventListener('click', (e) => {
        if (e.target.classList.contains('freq-btn')) {
            const newFrequency = e.target.dataset.freq;
            if (newFrequency !== currentFrequency) {
                currentFrequency = newFrequency;
                setActiveFrequency(newFrequency);
                // Re-renderiza la vista actual con la nueva frecuencia
                currentRenderFunction();
            }
        }
    });
}

function updateUserContext() {
    const currentUser = appData.users.find(u => u.ID_Usuario === currentUserId);
    if (!currentUser) { handleLogout(); return; }

    isAdmin = currentUser.Rol.toLowerCase() === 'admin';
    const userPill = document.getElementById('user-pill');
    userPill.innerHTML = `
        <img class="w-8 h-8 rounded-full" src="https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.Nombre_Completo)}" alt="Avatar">
        <div class="ml-3">
            <p class="text-sm font-semibold text-gray-800">${currentUser.Nombre_Completo}</p>
            <a href="#" id="logout-link" class="text-xs text-gray-500 hover:text-sky-600">Cerrar sesión</a>
        </div>
    `;
    document.getElementById('logout-link').addEventListener('click', handleLogout);

    // Muestra/oculta el botón de Admin
    document.getElementById('nav-admin').style.display = isAdmin ? 'flex' : 'none';
}

// --- Funciones de utilidad ---

function getResultsByFrequency(kpiId, frequency) {
    const allResults = appData.results.filter(r => r.ID_KPI === kpiId).sort((a, b) => b.Fecha - a.Fecha);
    if (allResults.length === 0) return [];

    const now = new Date();
    
    if (frequency === 'anual') {
        const currentYear = now.getFullYear();
        return allResults.filter(r => r.Fecha.getFullYear() === currentYear);
    }
    if (frequency === 'mensual') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return allResults.filter(r => r.Fecha.getMonth() === currentMonth && r.Fecha.getFullYear() === currentYear);
    }
    if (frequency === 'semanal') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Lunes como inicio de semana
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return allResults.filter(r => r.Fecha >= startOfWeek && r.Fecha <= endOfWeek);
    }
    return [];
}

function formatValue(value, unit) {
    if (unit === '$') {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);
    }
    if (unit === '%') {
        return `${((value || 0) * 100).toFixed(1)}%`;
    }
    return (value || 0).toLocaleString('es-MX');
}

function setActiveNav(id) {
    document.querySelectorAll('nav a').forEach(link => link.classList.remove('active-nav'));
    document.getElementById(id)?.classList.add('active-nav');
}

function setActiveFrequency(freq) {
    document.querySelectorAll('.freq-btn').forEach(btn => {
        btn.classList.toggle('active-freq', btn.dataset.freq === freq);
    });
}

// --- Control de Vistas ---
function showLoader() { loader.style.display = 'flex'; }
function hideLoader() { loader.style.display = 'none'; }
function showLoginView() { hideLoader(); loginView.style.display = 'flex'; appView.style.display = 'none'; }
function showAppView() { hideLoader(); loginView.style.display = 'none'; appView.style.display = 'block'; }