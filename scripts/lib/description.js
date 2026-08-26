// Shared product description + size chart, so build + updates stay identical.

// Women's body measurements (inches), Hollister-style bust-led sizing, extended to 2XL.
export const SIZE_CHART_HTML = `
<h4>Size guide</h4>
<p>Women's relaxed fit (Bella+Canvas 6400). Measure your body, not a shirt. Between sizes? Size up for a relaxed fit.</p>
<table>
  <thead><tr><th>Size</th><th>Bust (in)</th><th>Natural waist (in)</th></tr></thead>
  <tbody>
    <tr><td>S</td><td>34–35</td><td>27–28</td></tr>
    <tr><td>M</td><td>36–37</td><td>29–30</td></tr>
    <tr><td>L</td><td>38–39</td><td>31–32</td></tr>
    <tr><td>XL</td><td>40–42</td><td>33–35</td></tr>
    <tr><td>2XL</td><td>43–45</td><td>36–38</td></tr>
  </tbody>
</table>`.trim();

export function productDescription(p, defaults = {}) {
  const tagline = `${p.title}${p.verse ? ` — ${p.verse}` : ""}`;
  const blank = defaults.blank || "Bella+Canvas 6400";
  const womens = /6400/.test(blank);
  const cut = womens ? "women's relaxed tee" : "unisex tee";
  const fitLine = womens
    ? "Relaxed women's cut, true to size — size down for a closer fit. For reference, someone 5'8\" with a 36\" bust wears M."
    : "Relaxed unisex cut, true to size. For reference, someone 5'10\" and 175 lb wears L.";
  return [
    `<p>${tagline}</p>`,
    `<p>Printed left-chest on a soft, side-seamed ${blank} ${cut}. 100% Airlume combed ring-spun cotton (solid colors). Pre-shrunk, holds its shape and print wash after wash.</p>`,
    // Win #2: fit + model reference — kills size doubt.
    `<p><strong>Fit:</strong> ${fitLine}</p>`,
    // Win #3: risk remover.
    `<p><strong>Our promise:</strong> Print-guaranteed — any misprint reprinted free. Easy size exchanges.</p>`,
    // Win #1: size chart (popup placement handled at theme level; always present here).
    SIZE_CHART_HTML,
  ].join("\n");
}
