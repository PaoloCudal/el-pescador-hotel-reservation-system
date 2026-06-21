// 1. Password Toggle (Global Scope)
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const icon = document.getElementById('toggleIcon');
    
    if (!passwordInput || !icon) return;

    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    icon.textContent = isPassword ? "visibility_off" : "visibility";
    
    passwordInput.focus();
}
window.togglePassword = togglePassword;


document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("staffLoginForm");
    if (!form) return;

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const loginButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Basic UI feedback
        if (loginButton) loginButton.disabled = true;
        const originalBtnText = loginButton.textContent;
        loginButton.textContent = "Authenticating...";

        const loginData = {
            email: emailInput.value.trim(),
            password: passwordInput.value.trim()
        };

        try {
            const response = await fetch('/api/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                // Save token for Admin access
                localStorage.setItem("adminToken", result.token);
                // Redirect to Admin Dashboard
                window.location.href = "/Dashboard"; 
            } else {
                // Show generic error for security
                passwordError.textContent = result.message || "Invalid credentials";
                passwordInput.classList.add("input-validation-error");
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("Connection error. Please check if the server is running.");
        } finally {
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = originalBtnText;
            }
        }
    });

    emailInput.addEventListener("input", () => {
        emailError.textContent = "";
        emailInput.classList.remove("input-validation-error");
    });

    passwordInput.addEventListener("input", () => {
        passwordError.textContent = "";
        passwordInput.classList.remove("input-validation-error");
    });

    // --- KEYBOARD NAVIGATION ---
    const inputs = [emailInput, passwordInput];
    inputs.forEach((input, index) => {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    form.requestSubmit();
                }
            }
        });
    });
});