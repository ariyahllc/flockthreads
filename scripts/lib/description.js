// Shared product description + size chart, so build + updates stay identical.

// Women's body measurements (inches), Hollister-style bust-led sizing, extended to 2XL.
export const SIZE_CHART_WOMENS = `
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

// Unisex sizing is chest-led, not bust/waist. Shipping the women's table on a
// 3001 would send men a size too small, so each blank gets its own chart.
export const SIZE_CHART_UNISEX = `
<h4>Size guide</h4>
<p>Unisex relaxed fit (Bella+Canvas 3001). Measure around the fullest part of your chest. Between sizes? Size up.</p>
<table>
  <thead><tr><th>Size</th><th>To fit chest (in)</th><th>Garment length (in)</th></tr></thead>
  <tbody>
    <tr><td>S</td><td>34\u201336</td><td>28</td></tr>
    <tr><td>M</td><td>38\u201340</td><td>29</td></tr>
    <tr><td>L</td><td>42\u201344</td><td>30</td></tr>
    <tr><td>XL</td><td>46\u201348</td><td>31</td></tr>
    <tr><td>2XL</td><td>50\u201352</td><td>32</td></tr>
  </tbody>
</table>`.trim();

// Kept for callers that import the old name.
export const SIZE_CHART_HTML = SIZE_CHART_WOMENS;

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
    womens ? SIZE_CHART_WOMENS : SIZE_CHART_UNISEX,
  ].join("\n");
}
