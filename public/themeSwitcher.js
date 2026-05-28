const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const replacements = [
    // Tailwind Config Replacements
    { from: /colors: \{\s*primary: '#4ade80',\s*\/\* green-vivid \*\//g, to: "colors: {\n                    primary: '#16a34a',     /* green-600 */" },
    { from: /primary: '#4ade80'/g, to: "primary: '#16a34a'" },
    { from: /secondary: '#f59e0b'/g, to: "secondary: '#d97706'" },
    { from: /surface: '#0f2010'/g, to: "surface: '#f4f9f4'" },
    { from: /'surface-container': '#1a3018'/g, to: "'surface-container': '#e8f5e9'" },
    { from: /'surface-container-low': '#152815'/g, to: "'surface-container-low': '#ffffff'" },
    { from: /'surface-container-high': '#213d21'/g, to: "'surface-container-high': '#c8e6c9'" },
    { from: /'on-surface': '#dcfce7'/g, to: "'on-surface': '#064e3b'" },
    { from: /'on-surface-variant': '#86ab86'/g, to: "'on-surface-variant': '#14532d'" },
    { from: /'outline-variant': 'rgba\(74, 222, 128, 0\.4\)'/g, to: "'outline-variant': 'rgba(22, 163, 74, 0.2)'" },
    
    // HTML class string replacements
    { from: /bg-\[#0b190b\]/g, to: "bg-[#f4f9f4]" },
    { from: /bg-bg/g, to: "bg-[#f4f9f4]" },
    { from: /bg-\[#0a1208\]/g, to: "bg-[#f4f9f4]" },
    { from: /bg-\[#0f2010\]/g, to: "bg-[#ffffff]" },
    { from: /bg-\[#0a1208\]\/90/g, to: "bg-surface/90" },
    { from: /bg-\[#0a1208\]\/70/g, to: "bg-surface/70" },
    { from: /border-\[#2d5e2d\]\/30/g, to: "border-outline-variant" },
    { from: /text-neutral-500/g, to: "text-on-surface-variant" },
    { from: /text-\[#86ab86\]/g, to: "text-on-surface-variant" },
    { from: /text-on-primary-fixed/g, to: "text-white" },
    { from: /text-\[#0b190b\]/g, to: "text-white" },
    { from: /hover:text-white/g, to: "hover:text-[#ffffff]" },
    
    // Transparent shades
    { from: /rgba\(74,222,128,0\.1\)/g, to: "rgba(22,163,74,0.05)" },
    { from: /rgba\(74,222,128,0\.12\)/g, to: "rgba(22,163,74,0.08)" },
    { from: /rgba\(74,222,128,0\.2\)/g, to: "rgba(22,163,74,0.15)" },
    { from: /rgba\(74,222,128,0\.3\)/g, to: "rgba(22,163,74,0.25)" },
    { from: /rgba\(74,222,128,0\.05\)/g, to: "rgba(22,163,74,0.02)" },
    { from: /rgba\(134,171,134,0\.3\)/g, to: "rgba(22,163,74,0.1)" },
    { from: /rgba\(134,171,134,0\.05\)/g, to: "rgba(22,163,74,0.05)" },
    { from: /rgba\(134,171,134,0\.1\)/g, to: "rgba(22,163,74,0.1)" },
    
    // Hex shades
    { from: /#86ab86/g, to: "#14532d" },
];

for (const file of files) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    
    for (const rep of replacements) {
        content = content.replace(rep.from, rep.to);
    }
    
    fs.writeFileSync(p, content);
}

// Update css/style.css
const cssPath = path.join(dir, 'css', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

const cssReplacements = [
    { from: /--bg:\s*#0b190b;/g, to: "--bg:             #f4f9f4;" },
    { from: /--surface:\s*#0f2010;/g, to: "--surface:        #ffffff;" },
    { from: /--panel:\s*#152815;/g, to: "--panel:          #ffffff;" },
    { from: /--card:\s*#1a3018;/g, to: "--card:           #e8f5e9;" },
    { from: /--elevated:\s*#213d21;/g, to: "--elevated:       #c8e6c9;" },
    { from: /--sidebar:\s*#081408;/g, to: "--sidebar:        #f4f9f4;" },
    { from: /#0c1a0c/g, to: "#ffffff" },

    { from: /--text-primary:\s*#dcfce7;/g, to: "--text-primary:   #064e3b;" },
    { from: /--text-muted:\s*#86ab86;/g, to: "--text-muted:     #14532d;" },
    { from: /--text-faint:\s*#4a7c4a;/g, to: "--text-faint:     #16a34a;" },

    { from: /--border:\s*rgba\(74, 222, 128, 0\.12\);/g, to: "--border:         rgba(22, 163, 74, 0.2);" },
    { from: /--border-active:\s*rgba\(74, 222, 128, 0\.35\);/g, to: "--border-active:  rgba(22, 163, 74, 0.4);" },
    
    { from: /rgba\(15, 32, 16, 0\.7\)/g, to: "rgba(255, 255, 255, 0.85)" },
    { from: /background-color: #1a3018 !important;/g, to: "background-color: #ffffff !important;" },
    { from: /color: #a7f3d0 !important;/g, to: "color: #064e3b !important;" },
    { from: /background-color: #213d21 !important;/g, to: "background-color: #f0fdf4 !important;" },
];

for (const rep of cssReplacements) {
    css = css.replace(rep.from, rep.to);
}
fs.writeFileSync(cssPath, css);

console.log("Theme switched to Light!");
