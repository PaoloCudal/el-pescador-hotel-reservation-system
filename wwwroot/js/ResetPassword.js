document.addEventListener("DOMContentLoaded", () => {
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const newPasswordError = document.getElementById("new-password-error");
    const confirmPasswordError = document.getElementById("confirm-password-error");
    const resetBtn = document.getElementById("resetBtn");

    // Password toggle
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

    // Toast notification for non-live events
    function showToast(message, type = "success", duration = 3000) {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.classList.add("toast", type === "error" ? "toast-error" : "toast-success");
        toast.innerHTML = `${message} <button class="toast-close">&times;</button>`;
        container.appendChild(toast);

        toast.classList.add("show"); // show immediately
        toast.querySelector(".toast-close").onclick = () => toast.remove();

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ---------- LIVE PASSWORD VALIDATION ----------
    function validatePassword() {
        const pwd = newPasswordInput.value;
        const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{12,}$/;

        if (!pwd) {
            newPasswordError.textContent = "";
            newPasswordInput.classList.remove("input-validation-error");
        } else if (!regex.test(pwd)) {
            newPasswordError.textContent = "Password must be 12+ chars, include uppercase, lowercase, number & special";
            newPasswordInput.classList.add("input-validation-error");
        } else {
            newPasswordError.textContent = "";
            newPasswordInput.classList.remove("input-validation-error");
        }

        validateConfirmPassword();
    }

    function validateConfirmPassword() {
        const pwd = newPasswordInput.value;
        const confirm = confirmPasswordInput.value;

        if (!confirm) {
            confirmPasswordError.textContent = "";
            confirmPasswordInput.classList.remove("input-validation-error");
        } else if (pwd !== confirm) {
            confirmPasswordError.textContent = "Passwords do not match";
            confirmPasswordInput.classList.add("input-validation-error");
        } else {
            confirmPasswordError.textContent = "";
            confirmPasswordInput.classList.remove("input-validation-error");
        }
    }

    newPasswordInput.addEventListener("input", validatePassword);
    confirmPasswordInput.addEventListener("input", validateConfirmPassword);

    // ---------- RESET PASSWORD CLICK ----------
    resetBtn.addEventListener("click", async () => {
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Final validation before sending request
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{12,}$/;
        if (!passwordRegex.test(newPassword) || newPassword !== confirmPassword) {
            showToast("Please fix all errors before submitting.", "error");
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Password: newPassword,
                    ConfirmPassword: confirmPassword,
                    Token: new URLSearchParams(window.location.search).get('token')
                })
            });

            const data = await res.json();

            if (res.ok) {
                const duration = 3000;
                showToast("Password reset successful!", "success", duration);
                setTimeout(() => window.location.href = "/UserLogin", duration);
            } else {
                showToast(data.message || "Failed to reset password", "error");
            }

        } catch {
            showToast("Server error. Try again later.", "error");
        } finally {
            resetBtn.disabled = false;
            resetBtn.style.opacity = 1;
        }
    });
});
