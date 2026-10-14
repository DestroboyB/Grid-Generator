const themeToggleButton = document.getElementById("themeToggleButton");
const themeToggleIcon = themeToggleButton?.querySelector(".theme-toggle-icon");
const themeToggleLabel = themeToggleButton?.querySelector(".theme-toggle-label");

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    if (themeToggleButton) {
        const nextTheme = isDark ? "light" : "dark";
        const label = nextTheme === "dark" ? "Dark mode" : "Light mode";
        themeToggleButton.setAttribute("aria-label", `Switch to ${label.toLowerCase()}`);
        themeToggleButton.title = `Switch to ${label.toLowerCase()}`;

        if (themeToggleLabel) {
            themeToggleLabel.textContent = label;
        }

        if (themeToggleIcon) {
            themeToggleIcon.textContent = isDark ? "☀" : "☾";
        }
    }
}

let savedTheme = "light";
try {
    savedTheme = localStorage.getItem("gridGeneratorTheme") === "dark" ? "dark" : "light";
} catch (error) {
    // The app still works if storage is unavailable.
}

applyTheme(savedTheme);

themeToggleButton?.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);

    try {
        localStorage.setItem("gridGeneratorTheme", nextTheme);
    } catch (error) {
        // The selected theme lasts for this visit if storage is unavailable.
    }
});
