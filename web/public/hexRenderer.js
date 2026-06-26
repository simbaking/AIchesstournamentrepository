// Hex rendering utilities
const hexSize = 26; // Radius of hexagon
const hexWidth = 2 * hexSize;
const hexHeight = Math.sqrt(3) * hexSize;

function getHexPixel(q, r) {
    const x = hexSize * (3/2 * q);
    const y = hexSize * Math.sqrt(3) * (r + q/2);
    // Center the board
    return { 
        x: x + canvas.width / 2, 
        y: y + canvas.height / 2 
    };
}

function getHexFromPixel(px, py) {
    const x = px - canvas.width / 2;
    const y = py - canvas.height / 2;
    const q = (2/3 * x) / hexSize;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / hexSize;
    
    // Rounding to nearest hex
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(-q - r);
    const q_diff = Math.abs(rq - q);
    const r_diff = Math.abs(rr - r);
    const s_diff = Math.abs(rs - (-q - r));
    if (q_diff > r_diff && q_diff > s_diff) rq = -rr - rs;
    else if (r_diff > s_diff) rr = -rq - rs;
    
    return { q: rq, r: rr };
}

function drawHexPolygon(ctx, cx, cy, fillStyle, strokeStyle = 'black', lineWidth = 1) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i;
        const angle_rad = Math.PI / 180 * angle_deg;
        const hx = cx + hexSize * Math.cos(angle_rad);
        const hy = cy + hexSize * Math.sin(angle_rad);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}

function getHexColor(q, r) {
    // 3 color pattern for hex grids: (q - r) mod 3
    const val = (q - r) % 3;
    const posVal = val < 0 ? val + 3 : val;
    if (posVal === 0) return '#f0d9b5'; // Light
    if (posVal === 1) return '#b58863'; // Dark
    return '#e3c16f'; // Mid color
}

window.getHexPixel = getHexPixel;
window.getHexFromPixel = getHexFromPixel;
window.drawHexPolygon = drawHexPolygon;
window.getHexColor = getHexColor;
