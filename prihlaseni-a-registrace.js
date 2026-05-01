// ============================================================
// prihlaseni-a-registrace.js  — Google Sign-In mode
// COOP fix: při otevření auth-modalu se Google tlačítku nastaví
// handler který modal zavře PŘED spuštěním Google popup okna
// ============================================================
(function() {
    'use strict';

    const HARDCODED_ACCESS_PASSWORD_HASH = '256b5537a792c98a13c9b32bb6b6c90f0e63531fe77c3b4dee69ee1ca82c984b';

    const loginButton = document.getElementById('login-button');

    if (!loginButton) {
        console.warn("prihlaseni-a-registrace.js: Tlačítko #login-button nenalezeno.");
        return;
    }

    async function hashString(text) {
        const data = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function showLocalPasswordModal() {
        return new Promise(resolve => {
            const modal     = document.getElementById('local-password-modal');
            const input     = document.getElementById('local-password-input');
            const okBtn     = document.getElementById('local-password-ok-btn');
            const cancelBtn = document.getElementById('local-password-cancel-btn');
            const errorEl   = document.getElementById('local-password-error');

            if (!modal || !input || !okBtn || !cancelBtn) {
                console.error("Chybí HTML elementy pro local-password-modal.");
                resolve(null);
                return;
            }

            input.value = '';
            if (errorEl) errorEl.textContent = '';

            const handleEnter = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
            };
            input.addEventListener('keydown', handleEnter);

            const cleanup = () => {
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                input.removeEventListener('keydown', handleEnter);
            };

            okBtn.onclick = () => {
                cleanup();
                if (typeof window.hideModal === 'function') window.hideModal(modal);
                resolve(input.value);
            };
            cancelBtn.onclick = () => {
                cleanup();
                if (typeof window.hideModal === 'function') window.hideModal(modal);
                resolve(null);
            };

            if (typeof window.showModal === 'function') window.showModal(modal);
            input.focus();
        });
    }

    // ============================================================
    // showAuthModal — při otevření modalu rovnou nastavíme
    // Google tlačítku handler s COOP opravou
    // ============================================================
    window.showAuthModal = function() {
        const authModal       = document.getElementById('auth-modal');
        const googleSignInBtn = document.getElementById('google-signin-btn');
        const errorEl         = document.getElementById('auth-error-message');

        if (!authModal) return;

        // Vyčistíme chybovou hlášku
        if (errorEl) errorEl.textContent = '';

        // Nastavíme Google tlačítku onclick přímo zde při otevření modalu
        // Toto je místo kde patří COOP oprava — modal se zavře před popup
        if (googleSignInBtn) {
            googleSignInBtn.onclick = async function() {
                // ✅ COOP oprava: zavřeme modal PŘED Google popup oknem
                if (typeof window.hideModal === 'function') {
                    window.hideModal(authModal);
                    console.log("Modal zavřen"); // ← stejný log jako v Hvězdné Databázi
                }

                try {
                    await window.signInWithGoogle();
                    // Úspěch — onAuthStateChanged v google-auth.js aktualizuje UI
                } catch (err) {
                    // Chyba — modal znovu otevřeme a zobrazíme hlášku
                    if (typeof window.showModal === 'function') {
                        window.showModal(authModal);
                    }
                    if (errorEl) errorEl.textContent = err.message || 'Přihlášení selhalo.';
                    console.error("❌ Google Sign-In chyba:", err);
                }
            };
        }

        // Otevřeme modal
        if (typeof window.showModal === 'function') window.showModal(authModal);
    };

    async function handleLoginClick() {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            console.log("Uživatel již přihlášen:", currentUser.displayName);
            window.showAuthModal();
            return;
        }

        const enteredPassword = await showLocalPasswordModal();
        if (enteredPassword === null) {
            console.log("Zadání hesla zrušeno uživatelem.");
            return;
        }

        const enteredHash = await hashString(enteredPassword);

        if (enteredHash === HARDCODED_ACCESS_PASSWORD_HASH) {
            console.log("✅ Lokální heslo správně — otevírám Google Sign-In.");
            window.showAuthModal();
        } else {
            const errorEl = document.getElementById('local-password-error');
            const modal   = document.getElementById('local-password-modal');
            if (errorEl) errorEl.textContent = "Chybné heslo! Zkuste to znovu.";
            if (modal && typeof window.showModal === 'function') {
                window.showModal(modal);
                const input = document.getElementById('local-password-input');
                if (input) input.focus();
            } else {
                alert("Chybné heslo. Přístup zamítnut.");
            }
            console.log("❌ Lokální heslo chybné.");
        }
    }

    loginButton.onclick = handleLoginClick;
    console.log("✅ prihlaseni-a-registrace.js načten (Google Sign-In mode).");
})();

// ============================================================
// Logout tlačítko — viditelnost řízena Firebase Auth state
// ============================================================
(function() {
    'use strict';
    const logoutButton = document.getElementById('logout-button');
    if (!logoutButton) return;

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            logoutButton.classList.remove('hidden');
        } else {
            logoutButton.classList.add('hidden');
        }
    });
})();