export function formatXP(bytes) {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(2) + ' MB';
  if (bytes >= 1000) return (bytes / 1000).toFixed(1) + ' kB';
  return bytes + ' B';
}

const shortDate = (ms) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });

export function renderXPGraph(transactions) {
  const holder = document.getElementById('xp-graph');
  if (!transactions.length) {
    holder.innerHTML = '<p class="empty">No XP recorded yet.</p>';
    return;
  }

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  let running = 0;
  const points = sorted.map((t) => {
    running += t.amount;
    return { t: new Date(t.createdAt).getTime(), xp: running };
  });

  const width = 640, height = 260, padX = 62, padY = 34;
  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const maxXP = points[points.length - 1].xp;
  const spanT = Math.max(maxT - minT, 1);

  const scaleX = (t) => padX + ((t - minT) / spanT) * (width - padX - 20);
  const scaleY = (xp) => height - padY - (xp / maxXP) * (height - padY * 2);

  const linePoints = points.map((p) => `${scaleX(p.t)},${scaleY(p.xp)}`).join(' ');
  const areaPoints = `${scaleX(minT)},${height - padY} ${linePoints} ${scaleX(maxT)},${height - padY}`;

  // Horizontal rules at quarter steps, labelled in XP
  const gridlines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = scaleY(maxXP * f);
      return `
        <line x1="${padX}" y1="${y}" x2="${width - 20}" y2="${y}" class="gridline" />
        <text x="${padX - 10}" y="${y + 4}" text-anchor="end" class="tick">${
          f === 0 ? '0' : formatXP(maxXP * f)
        }</text>`;
    })
    .join('');

  // Markers stay legible only on a modest number of transactions
  const nodes =
    points.length <= 80
      ? points
          .map(
            (p, i) =>
              `<circle cx="${scaleX(p.t)}" cy="${scaleY(p.xp)}" r="${
                i === points.length - 1 ? 5 : 3
              }" class="node${i === points.length - 1 ? ' node-last' : ''}" />`
          )
          .join('')
      : `<circle cx="${scaleX(maxT)}" cy="${scaleY(maxXP)}" r="5" class="node node-last" />`;

  holder.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative XP over time">
      ${gridlines}
      <polygon points="${areaPoints}" class="area" />
      <polyline points="${linePoints}" class="line" />
      ${nodes}
      <line x1="${padX}" y1="${height - padY}" x2="${width - 20}" y2="${height - padY}" class="axis" />
      <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${height - padY}" class="axis" />
      <text x="${padX}" y="${height - padY + 20}" class="tick">${shortDate(minT)}</text>
      <text x="${width - 20}" y="${height - padY + 20}" text-anchor="end" class="tick">${shortDate(maxT)}</text>
    </svg>
  `;
}

export function renderPassFailGraph(rows) {
  const holder = document.getElementById('pf-graph');
  if (!rows.length) {
    holder.innerHTML = '<p class="empty">No graded projects yet.</p>';
    return;
  }

  const pass = rows.filter((r) => r.grade >= 1).length;
  const fail = rows.filter((r) => r.grade != null && r.grade < 1).length;
  const total = pass + fail;
  const passPct = total ? pass / total : 0;

  const size = 230, radius = 78, stroke = 22;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const passLen = circumference * passPct;

  holder.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Pass versus fail ratio">
      <circle cx="${cx}" cy="${cy}" r="${radius + stroke / 2 + 6}" fill="none"
        stroke="var(--edge-soft)" stroke-width="1" />
      <circle cx="${cx}" cy="${cy}" r="${radius}g" class="ring-track" stroke-width="${stroke}" fill="none" />
      <circle cx="${cx}" cy="${cy}" r="${radius}" class="ring-pass" stroke-width="${stroke}" fill="none"
        stroke-dasharray="${passLen} ${circumference - passLen}"
        transform="rotate(-90 ${cx} ${cy})" />
      <text x="${cx}" y="${cy + 2}" text-anchor="middle" class="donut-figure">${Math.round(passPct * 100)}%</text>
      <text x="${cx}" y="${cy + 22}" text-anchor="middle" class="donut-label">passed</text>
    </svg>
    <div class="legend">
      <span class="legend-item"><i class="dot pass"></i>Pass — ${pass}</span>
      <span class="legend-item"><i class="dot fail"></i>Fail — ${fail}</span>
    </div>
  `;
}

export function renderXPByProjectGraph(transactions) {
  const holder = document.getElementById('xp-by-project-graph');
  if (!transactions.length) {
    holder.innerHTML = '<p class="empty">No project XP yet.</p>';
    return;
  }

  const totals = {};
  transactions.forEach((t) => {
    const name = (t.path || 'unknown').split('/').filter(Boolean).pop() || 'unknown';
    totals[name] = (totals[name] || 0) + t.amount;
  });

  const top = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const width = 640, barHeight = 24, gap = 18, pad = 190, rightPad = 78;
  const maxVal = top[0][1];
  const height = top.length * (barHeight + gap);

  const bars = top
    .map(([name, val], i) => {
      const y = i * (barHeight + gap);
      const barWidth = Math.max((val / maxVal) * (width - pad - rightPad), 2);
      return `
        <text x="${pad - 12}" y="${y + barHeight / 2 + 5}" text-anchor="end" class="tick tick-name">${name}</text>
        <rect x="${pad}" y="${y}" width="${barWidth}" height="${barHeight}" class="bar" />
        <rect x="${pad}" y="${y}" width="${barWidth}" height="4" class="bar-cap" />
        <line x1="${pad}" y1="${y + barHeight + gap / 2}" x2="${width - rightPad}" y2="${y + barHeight + gap / 2}" class="gridline" />
        <text x="${pad + barWidth + 10}" y="${y + barHeight / 2 + 5}" class="tick tick-val">${formatXP(val)}</text>
      `;
    })
    .join('');

  holder.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="XP earned by project">
      <line x1="${pad}" y1="0" x2="${pad}" y2="${height - gap / 2}" class="axis" />
      ${bars}
    </svg>
  `;
}
