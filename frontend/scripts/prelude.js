/*

Constants

*/

const API_URL = "/api/v1";


/*

Global variables

*/

var state = {
    list_object: null,
    prev_lists: [],
}

const base_colors = [
    "#0E0E0E",
    "#6C009B",
    "#9B0044",
    "#A82F19",
    "#1955AF",
    "#0D5A26",
];

function setThemeColors() {
    let color_index = Number(localStorage.getItem('theme-color') || 0);

    if (`${color_index}` == "NaN") {
        color_index = 0;
    }

    let new_color = base_colors[color_index];

    for (let i = 1; i < 5; i++) {
        // Increase color luminosity by 20% for each step
        new_color = chroma(new_color).brighten(0.4).hex();

        document.documentElement.style.setProperty('--theme-color-' + i, new_color);
    }

    localStorage.setItem('theme-color', color_index);
}

setThemeColors();