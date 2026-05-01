// ============================================================
// google-auth.js  — nahrazuje supabase.js
// Firebase Auth s Google Sign-In
// ZMĚNA: signInWithPopup → signInWithRedirect (fix pro GitHub Pages COOP)
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {

    const loadingIndicatorElement = document.getElementById('loading-indicator');

    if (loadingIndicatorElement) {
        loadingIndicatorElement.textContent = "Načítání stránky a dat...";
        loadingIndicatorElement.classList.remove('hidden');
    }

    if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
        console.error('Firebase library not loaded.');
        if (loadingIndicatorElement) {
            loadingIndicatorElement.textContent = 'Kritická chyba: Knihovna Firebase se nenačetla.';
        }
        document.body.style.visibility = 'visible';
        return;
    }

    // ============================================================
    // NOVÉ: Zkontrolujeme výsledek redirect přihlášení
    // Toto se spustí po návratu z Google přihlašovací stránky
    // ============================================================
    try {
        const result = await firebase.auth().getRedirectResult();
        if (result && result.user) {
            console.log("✅ Google redirect přihlášení úspěšné:", result.user.displayName);
        }
    } catch (error) {
        console.error("❌ Chyba při redirect přihlášení:", error);
        const errorEl = document.getElementById('auth-error-message');
        if (errorEl) errorEl.textContent = error.message || 'Přihlášení selhalo.';
    }

    // --- Auth state listener ---
    let _authInitialized = false;

    firebase.auth().onAuthStateChanged((user) => {
        const loginBtn      = document.getElementById('login-button');
        const editModeBtn   = document.getElementById('edit-mode-toggle-btn');
        const userIdDisplay = document.getElementById('user-id-display');
        const userIdSpan    = document.getElementById('firebase-user-id');

        if (user) {
            console.log("🔐 Přihlášen:", user.displayName || user.email, "| UID:", user.uid);
            currentUserId = user.uid;

            if (loginBtn)    loginBtn.classList.add('hidden');
            if (editModeBtn) editModeBtn.classList.remove('hidden');
            if (userIdSpan)    userIdSpan.textContent = user.uid;
            if (userIdDisplay) userIdDisplay.classList.remove('hidden');

            if (localStorage.getItem(EDIT_MODE_KEY) === 'true') {
                if (typeof enableEditMode === 'function') enableEditMode();
                if (editModeBtn) editModeBtn.textContent = ' 💾';
            } else {
                if (typeof disableEditMode === 'function') disableEditMode();
                if (editModeBtn) editModeBtn.textContent = '🔐';
            }

        } else {
            console.log("🔓 Nepřihlášen.");
            currentUserId = null;

            if (loginBtn)      loginBtn.classList.remove('hidden');
            if (editModeBtn)   editModeBtn.classList.add('hidden');
            if (userIdDisplay) userIdDisplay.classList.add('hidden');

            if (typeof disableEditMode === 'function') disableEditMode();
            try { localStorage.removeItem(EDIT_MODE_KEY); } catch(e) {}
        }

        if (!_authInitialized) {
            _authInitialized = true;
            initializeApp();
            if (loadingIndicatorElement) loadingIndicatorElement.classList.add('hidden');
            document.body.style.visibility = 'visible';
        }
    });

});

// ============================================================
// initializeApp()
// ============================================================
async function initializeApp() {
    try {
        if (typeof setupNavigation === 'function') setupNavigation();
        if (typeof showSection === 'function') showSection('about', true);
        if (typeof loadDataFromFirestore === 'function') await loadDataFromFirestore();
        if (typeof setupFirestoreRealtimeListener === 'function') setupFirestoreRealtimeListener();
        console.log("✅ initializeApp() dokončeno.");
    } catch (err) {
        console.error("❌ Chyba v initializeApp():", err);
    }
}

// ============================================================
// formatTimestamp()
// ============================================================
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Neznámé datum';
    if (typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleString('cs-CZ');
    }
    return new Date(timestamp).toLocaleString('cs-CZ');
}

// ============================================================
// showAuthModal() / hideAuthModal()
// ============================================================
window.showAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (modal && typeof showModal === 'function') showModal(modal);
};

window.hideAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (modal && typeof hideModal === 'function') hideModal(modal);
};

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('cancel-auth-btn')?.addEventListener('click', window.hideAuthModal);
});

// ============================================================
// HLAVNÍ ZMĚNA: signInWithRedirect místo signInWithPopup
// Žádný popup → žádná COOP chyba na GitHub Pages
// ============================================================
window.signInWithGoogle = async function() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        // Přesměruje uživatele na Google přihlašovací stránku
        await firebase.auth().signInWithRedirect(provider);
        // Kód pod tímto řádkem se nespustí — stránka se přesměruje
    } catch (error) {
        console.error("❌ Chyba Google přihlášení:", error);
        let msg = "Přihlášení selhalo.";
        if (error.code === 'auth/network-request-failed') msg = "Chyba sítě. Zkontrolujte připojení.";
        if (error.code === 'auth/unauthorized-domain')    msg = "Tato doména není povolena v Firebase konzoli.";
        throw { code: error.code, message: msg };
    }
};

// ============================================================
// Odhlášení
// ============================================================
window.signOut = async function() {
    const confirmed = await (window.showConfirmModal ?
        showConfirmModal("Odhlásit se?", "Opravdu se chcete odhlásit?", {
            okText: 'Ano, odhlásit',
            cancelText: 'Zůstat přihlášen'
        }) :
        confirm("Opravdu se chcete odhlásit?")
    );

    if (confirmed) {
        if (typeof showLoading === 'function') showLoading("Odhlašování...");
        try {
            await firebase.auth().signOut();
            if (typeof showAlertModal === 'function') {
                showAlertModal("Odhlášení", "Byli jste úspěšně odhlášeni. Pro úpravy se opět přihlaste.");
            }
        } catch (error) {
            console.error("❌ Chyba odhlašování:", error);
            if (typeof showAlertModal === 'function') {
                showAlertModal("Chyba odhlášení", `Nepodařilo se odhlásit: ${error.message}`);
            }
        } finally {
            if (typeof hideLoading === 'function') hideLoading();
        }
    }
};

window.getCurrentUser = () => firebase.auth().currentUser;

console.log("✅ google-auth.js načten.");