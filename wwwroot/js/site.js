// ===============================
// AUTH REDIRECT HELPERS
// ===============================

window.getReturnUrl = function () {
    return window.location.pathname + window.location.search;
};

window.goToLogin = function () {
    const returnUrl = getReturnUrl();
    window.location.href =
        `/Accounts/User/UserLogin?returnUrl=${encodeURIComponent(returnUrl)}`;
};

window.goToSignup = function () {
    const returnUrl = getReturnUrl();
    window.location.href =
        `/Accounts/User/UserRegistration?returnUrl=${encodeURIComponent(returnUrl)}`;
};
