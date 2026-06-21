const returnUrl =
    new URLSearchParams(window.location.search).get("returnUrl") || "/";

document.addEventListener("DOMContentLoaded", () => {

    /* ================= LOGIN ELEMENTS ================= */
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const emailErrorSpan = document.getElementById("email-error");
    const passwordErrorSpan = document.getElementById("password-error");
    const loginButton = document.getElementById("login-button");

    let emailValid = false;
    let passwordValid = false;

    /* ================= API HELPERS ================= */
    async function checkEmail(email) {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
        return await res.json();
    }

    async function checkPassword(email, password) {
        const res = await fetch('/api/auth/check-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Email: email, Password: password })
        });
        return await res.json();
    }

    /* ================= PASSWORD TOGGLE ================= */
    window.togglePass = function (el) {
        const input = el.closest('.input-wrapper').querySelector('input');
        const icon = el.querySelector('.material-icons');

        if (input.type === "password") {
            input.type = "text";
            icon.textContent = "visibility_off";
        } else {
            input.type = "password";
            icon.textContent = "visibility";
        }
    };

    /* ================= EMAIL VALIDATION ================= */
    emailInput.addEventListener("input", () => {
        clearTimeout(emailInput._t);

        emailInput._t = setTimeout(async () => {
            const email = emailInput.value.trim();

            if (!email) {
                emailValid = false;
                emailErrorSpan.textContent = "";
                return;
            }

            try {
                const data = await checkEmail(email);

                emailValid = data.exists;

                if (!data.exists) {
                    emailErrorSpan.textContent = "Email not found";
                } else {
                    emailErrorSpan.textContent = "";
                }

            } catch {
                emailValid = false;
                emailErrorSpan.textContent = "Server error";
            }
        }, 300);
    });

    /* ================= PASSWORD VALIDATION ================= */
    passwordInput.addEventListener("input", () => {
        clearTimeout(passwordInput._t);

        passwordInput._t = setTimeout(async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                passwordValid = false;
                passwordErrorSpan.textContent = "";
                return;
            }

            try {
                const data = await checkPassword(email, password);

                passwordValid = data.valid;

                if (!data.valid) {
                    passwordErrorSpan.textContent = "Incorrect password";
                } else {
                    passwordErrorSpan.textContent = "";
                }

            } catch {
                passwordValid = false;
                passwordErrorSpan.textContent = "Server error";
            }
        }, 300);
    });

    /* ================= TOAST ================= */
    function showToast(message, type = "success", duration = 3000) {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
        toast.innerHTML = `${message} <button class="toast-close">&times;</button>`;

        container.appendChild(toast);

        toast.classList.add("show");

        toast.querySelector(".toast-close").onclick = () => toast.remove();

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /* ================= LOGIN ================= */
    loginButton.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showToast("Fill all fields", "error");
            return;
        }

        try {
            const emailRes = await checkEmail(email);
            const passRes = await checkPassword(email, password);

            if (!emailRes.exists || !passRes.valid) {
                showToast("Invalid credentials", "error");
                return;
            }

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(data.message || "Login failed", "error");
                return;
            }

            showToast("Login successful!", "success");

            setTimeout(() => {
                window.location.href = returnUrl;
            }, 900);

        } catch {
            showToast("Server error", "error");
        }
    });

    /* ================= ENTER KEY ================= */
    [emailInput, passwordInput].forEach((el, i, arr) => {
        el.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                e.preventDefault();

                if (i < arr.length - 1) {
                    arr[i + 1].focus();
                } else {
                    loginButton.click();
                }
            }
        });
    });

    /* ================= FORGOT PASSWORD ================= */
    const modal = document.getElementById("forgotPasswordModal");
    const forgotEmailInput = document.getElementById("forgotEmail");
    const forgotEmailError = document.getElementById("forgot-email-error");
    const forgotBtn = document.getElementById("forgotPasswordBtn");

    window.openForgotPasswordModal = () => {
        modal.style.display = "flex";
        forgotEmailInput.value = "";
        forgotEmailError.textContent = "";
    };

    window.closeForgotPasswordModal = () => {
        modal.style.display = "none";
    };

    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    forgotEmailInput.addEventListener("input", () => {
        clearTimeout(forgotEmailInput._t);

        forgotEmailInput._t = setTimeout(async () => {
            const email = forgotEmailInput.value.trim();

            if (!email) return;

            try {
                const data = await checkEmail(email);

                forgotEmailError.textContent = data.exists ? "" : "Email not found";

            } catch {
                forgotEmailError.textContent = "Server error";
            }
        }, 300);
    });

    forgotBtn.addEventListener("click", async () => {
        const email = forgotEmailInput.value.trim();

        if (!email) {
            showToast("Enter email", "error");
            return;
        }

        forgotBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                showToast("Reset link sent!", "success");

                setTimeout(() => {
                    closeForgotPasswordModal();
                    forgotBtn.disabled = false;
                }, 3000);

            } else {
                showToast(data.message || "Failed", "error");
                forgotBtn.disabled = false;
            }

        } catch {
            showToast("Server error", "error");
            forgotBtn.disabled = false;
        }
    });

});