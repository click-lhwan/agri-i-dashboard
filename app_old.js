const DEFAULT_CONFIG = window.AGRII_CONFIG || {};
const STORAGE_KEY_CONFIG = 'agrii.runtime.config.v3';
const STORAGE_KEY_LOGIN = 'agrii.login.profile.v3';
const STORAGE_KEY_POLYGONS = 'agrii.field.polygons.v3';
const CH4_GWP100 = Number(DEFAULT_CONFIG.CH4_GWP100 || 27.0);

const state = {
  config: loadRuntimeConfig(),
  data: null,
  selectedFieldId: null,
  map: null,
  baseTile: null,
  geeTile: null,
  polygonLayer: null,
  aoiLayer: null,
  aoiLabel: null,
  drawLayer: null,
  drawPolyline: null,
  fieldLabel: null,
  drawPoints: [],
  isDrawing: false,
  ch4Chart: null,
  ndwiChart: null,
  geeReady: false,
  user: loadStoredLogin()
};

const fmt = new Intl.NumberFormat('en-US');
const fmtKo = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const FIELD_NAMES = ['Gimje AWD Plot', 'Cheorwon Test Field', 'Iksan Rice Group', 'Haenam Demo Farm', 'Northern Rice Block', 'AWD Trial Parcel', 'Rice MRV Pilot Field'];

window.addEventListener('DOMContentLoaded', init);

async function init(){
  bindUiEvents();
  setupConfigForm();
  setupLoginGate();
  await loadData();
}

function bindUiEvents(){
  byId('openConfigButton')?.addEventListener('click', () => byId('configDialog').showModal());
  byId('saveConfigButton')?.addEventListener('click', saveConfigFromForm);
  byId('googleLoginButton')?.addEventListener('click', renderGoogleButtons);
  byId('connectGeeButton')?.addEventListener('click', connectEarthEngine);
  byId('loadGeeButton')?.addEventListener('click', loadSentinel2ForCurrentField);
  byId('signOutButton')?.addEventListener('click', signOut);
  byId('demoLoginButton')?.addEventListener('click', () => {
    state.user = { name: 'Agri-I Team', email: 'demo@agri-i.local', picture: '', demo: true };
    localStorage.setItem(STORAGE_KEY_LOGIN, JSON.stringify(state.user));
    showApp();
  });
  byId('drawButton')?.addEventListener('click', startBoundaryDraw);
  byId('finishDrawButton')?.addEventListener('click', finishBoundaryDraw);
  byId('resetBoundaryButton')?.addEventListener('click', resetBoundary);
  byId('applyGeojsonButton')?.addEventListener('click', applyGeojsonBoundary);
  byId('copyGeojsonButton')?.addEventListener('click', copyBoundaryGeojson);
  byId('exportButton')?.addEventListener('click', () => {
    const f = currentField();
    const blob = new Blob([JSON.stringify(f, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${f.id}_agri_i_snapshot.json`; a.click();
    URL.revokeObjectURL(url);
  });
}

function setupConfigForm(){
  byId('cfgClientId').value = state.config.GOOGLE_OAUTH_CLIENT_ID || '';
  byId('cfgProjectId').value = state.config.GEE_CLOUD_PROJECT_ID || '';
  byId('cfgS2Collection').value = state.config.SENTINEL2_COLLECTION || 'COPERNICUS/S2_SR_HARMONIZED';
}

function setupLoginGate(){
  if(state.user){
    showApp();
  }else{
    byId('loginGate').classList.remove('hidden');
    byId('appShell').classList.add('hidden');
    renderGoogleButtons();
  }
}

function showApp(){
  byId('loginGate').classList.add('hidden');
  byId('appShell').classList.remove('hidden');
  updateUserUi();
  // The map can be initialized while the app is hidden by the login screen.
  // Re-render after the shell is visible to prevent broken / partial imagery tiles.
  requestAnimationFrame(() => {
    if(state.data) renderAll();
    setTimeout(() => state.map?.invalidateSize(true), 250);
  });
}

function updateUserUi(){
  const u = state.user || {name:'Agri-I Team', email:'Dashboard'};
  byId('userName').textContent = u.name || 'Agri-I Team';
  byId('userEmail').textContent = u.email || 'Dashboard';
  byId('userAvatar').textContent = initials(u.name || u.email || 'AG');
}

function renderGoogleButtons(){
  const clientId = state.config.GOOGLE_OAUTH_CLIENT_ID;
  const containers = [byId('googleButton'), byId('modalGoogleButton')].filter(Boolean);
  containers.forEach(c => c.innerHTML = '');
  if(!clientId){
    setConfigStatus('Google OAuth Client ID가 비어 있습니다. Config에 Client ID를 입력하세요.');
    return;
  }
  if(!window.google?.accounts?.id){
    setConfigStatus('Google Identity Services 스크립트가 아직 로드되지 않았습니다. 잠시 후 다시 누르세요.');
    return;
  }
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: false
  });
  containers.forEach(c => window.google.accounts.id.renderButton(c, { theme:'outline', size:'large', width: 260 }));
  setConfigStatus('Google Sign-In 버튼을 렌더링했습니다.');
}

function handleGoogleCredential(response){
  try{
    const payload = decodeJwt(response.credential);
    state.user = { name: payload.name || payload.email || 'Google User', email: payload.email || '', picture: payload.picture || '', sub: payload.sub || '' };
    localStorage.setItem(STORAGE_KEY_LOGIN, JSON.stringify(state.user));
    showApp();
    setConfigStatus(`Google 로그인 완료: ${state.user.email}`);
  }catch(err){
    console.error(err);
    setConfigStatus('Google credential 해석에 실패했습니다.');
  }
}

function signOut(){
  localStorage.removeItem(STORAGE_KEY_LOGIN);
  state.user = null;
  if(window.google?.accounts?.id){ window.google.accounts.id.disableAutoSelect(); }
  byId('loginGate').classList.remove('hidden');
  byId('appShell').classList.add('hidden');
  renderGoogleButtons();
}

function decodeJwt(jwt){
  const body = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(atob(body).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  return JSON.parse(json);
}

function loadRuntimeConfig(){
  try{
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || '{}');
    return {...DEFAULT_CONFIG, ...stored};
  }catch{
    return {...DEFAULT_CONFIG};
  }
}

function saveConfigFromForm(){
  state.config = {
    ...state.config,
    GOOGLE_OAUTH_CLIENT_ID: byId('cfgClientId').value.trim(),
    GEE_CLOUD_PROJECT_ID: byId('cfgProjectId').value.trim(),
    SENTINEL2_COLLECTION: byId('cfgS2Collection').value.trim() || 'COPERNICUS/S2_SR_HARMONIZED'
  };
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(state.config));
  setConfigStatus('Config saved. GitHub에 영구 반영하려면 config.js에도 같은 값을 넣으세요.');
  setupConfigForm();
}

function setConfigStatus(message){
  const el = byId('configStatus');
  if(el) el.textContent = message;
}

function loadStoredLogin(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY_LOGIN) || 'null');}catch{return null;}
}

async function loadData(){
  try{
    const res = await fetch(state.config.CSV_PATH || 'data/ch4_predictions.csv');
    if(!res.ok) throw new Error('CSV not found');
    const csv = await res.text();
    state.data = buildDataFromCsv(csv);
    state.selectedFieldId = state.data.fields[0]?.id;
    populateFieldSelect();
    renderAll();
  }catch(err){
    console.error(err);
    alert('CSV 데이터를 불러오지 못했습니다. data/ch4_predictions.csv 경로를 확인하세요.');
  }
}

function parseCsv(text){
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r?\n/).filter(Boolean);
  if(!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = (values[i] ?? '').trim());
    return row;
  });
}

function splitCsvLine(line){
  const out=[]; let cur=''; let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch === '"'){
      if(inQuotes && line[i+1] === '"'){ cur += '"'; i++; }
      else inQuotes = !inQuotes;
    }else if(ch === ',' && !inQuotes){ out.push(cur); cur=''; }
    else cur += ch;
  }
  out.push(cur); return out;
}

function buildDataFromCsv(csvText){
  const rows = parseCsv(csvText).map(r => ({
    lat: Number(r['위도'] ?? r.lat ?? r.latitude),
    lon: Number(r['경도'] ?? r.lon ?? r.longitude),
    start: r['시작시간'] ?? r.start ?? r.date,
    end: r['종료시간'] ?? r.end ?? '',
    ch4: Number(r['CH4_추정량'] ?? r.ch4 ?? r.CH4)
  })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.start && Number.isFinite(r.ch4));

  const groups = new Map();
  rows.forEach(r => {
    const key = `${r.lat.toFixed(6)},${r.lon.toFixed(6)}`;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  const savedPolygons = loadSavedPolygons();
  const fields = Array.from(groups.entries()).map(([key, group], idx) => {
    const [lat, lon] = key.split(',').map(Number);
    group.sort((a,b) => parseDate(a.start) - parseDate(b.start));
    const rawSeries = group.map(r => ({ date: normalizeDate(r.start), ch4: round4(r.ch4) }));
    const ch4Series = interpolateFiveDay(rawSeries);
    const maxCh4 = Math.max(...ch4Series.map(d => d.ch4));
    const minCh4 = Math.min(...ch4Series.map(d => d.ch4));
    const baseline = maxCh4;
    ch4Series.forEach(d => d.co2e_reduction = round4(Math.max(0, baseline - d.ch4) * CH4_GWP100));
    const ndwiSeries = ch4Series.map(d => ({ date: d.date, value: round4(ch4ToDemoSentinel2Ndwi(d.ch4, minCh4, maxCh4)) }));
    const latest = ch4Series[ch4Series.length - 1] || {date:'-', ch4:0, co2e_reduction:0};
    const latestNdwi = ndwiSeries[ndwiSeries.length - 1] || {value:0};
    const id = `KR-RICE-${String(idx+1).padStart(3, '0')}`;
    const areaHa = round2(1.2 + (idx * 0.87) % 4.8);
    return {
      id, farmName: FIELD_NAMES[idx % FIELD_NAMES.length], areaHa, crop: 'Rice (AWD)', lat, lon,
      polygon: savedPolygons[id] || fieldLikePolygon(lat, lon, idx),
      ch4Series, ndwiSeries, ndwiSource: 'Demo Sentinel-2 NDWI proxy',
      latest: { date: latest.date, ch4: latest.ch4, co2eReduction: latest.co2e_reduction, ndwi: latestNdwi.value }
    };
  });

  const estimatedCo2eReduction = fields.reduce((sum, f) => sum + (f.latest.co2eReduction || 0), 0);
  return { kpis: { participatingFarms: fields.length, monitoredParcels: fields.length, aoi: `${state.config.AOI_SIDE_METERS || 500}m`, estimatedCo2eReduction: round2(estimatedCo2eReduction) }, fields };
}

function parseDate(value){ return new Date(`${normalizeDate(value)}T00:00:00`); }
function normalizeDate(value){ return String(value).slice(0,10); }

function interpolateFiveDay(rawSeries){
  const points = rawSeries.map(d => ({ t: parseDate(d.date).getTime(), date: d.date, ch4: d.ch4 })).sort((a,b)=>a.t-b.t);
  if(points.length <= 1) return rawSeries;
  const start = points[0].t, end = points[points.length-1].t, step = 5*24*60*60*1000;
  const out = [];
  for(let t=start; t<=end+1; t+=step){
    let left = points[0], right = points[points.length-1];
    for(let i=0; i<points.length-1; i++){
      if(points[i].t <= t && t <= points[i+1].t){ left=points[i]; right=points[i+1]; break; }
    }
    let ch4 = left.ch4;
    if(right.t !== left.t){
      const ratio = (t-left.t)/(right.t-left.t);
      ch4 = left.ch4 + ratio*(right.ch4-left.ch4);
    }
    out.push({ date: new Date(t).toISOString().slice(0,10), ch4: round4(ch4) });
  }
  return out;
}

function ch4ToDemoSentinel2Ndwi(ch4, minCh4, maxCh4){
  if(maxCh4 === minCh4) return 0.08;
  const normalized = (ch4 - minCh4) / (maxCh4 - minCh4);
  return -0.32 + normalized * 0.78;
}

function fieldLikePolygon(lat, lon, idx){
  // Small irregular field-like polygon, roughly inside the 500m AOI.
  const latM = metersToLat(85 + (idx%3)*12);
  const lonM = metersToLon(125 + (idx%2)*20, lat);
  return [
    [lat + latM*0.86, lon - lonM*0.94],
    [lat + latM*0.72, lon + lonM*0.72],
    [lat + latM*0.12, lon + lonM*1.05],
    [lat - latM*0.82, lon + lonM*0.62],
    [lat - latM*0.70, lon - lonM*0.78],
    [lat + latM*0.22, lon - lonM*1.06]
  ];
}

function populateFieldSelect(){
  const select = byId('fieldSelect');
  select.innerHTML = '';
  state.data.fields.forEach(f => {
    const option = document.createElement('option');
    option.value = f.id; option.textContent = `${f.id} · ${f.farmName}`;
    select.appendChild(option);
  });
  select.value = state.selectedFieldId;
  select.onchange = e => { state.selectedFieldId = e.target.value; renderAll(); };
}

function currentField(){ return state.data.fields.find(f => f.id === state.selectedFieldId) || state.data.fields[0]; }

function renderAll(){
  const f = currentField();
  if(!f) return;
  renderKpis(); renderMobileHero(f); renderDetails(f); renderTable(); renderMap(f); renderCharts(f);
}

function renderKpis(){
  const k = state.data.kpis;
  byId('kpiFarms').textContent = fmt.format(k.participatingFarms);
  byId('kpiParcels').textContent = fmt.format(k.monitoredParcels);
  byId('kpiAoi').textContent = k.aoi;
  byId('kpiCo2e').textContent = `${fmtKo.format(k.estimatedCo2eReduction)} tCO₂e`;
}

function renderMobileHero(f){
  byId('mFieldName').textContent = f.farmName;
  byId('mFieldMeta').textContent = `${f.id} · ${f.areaHa} ha`;
  byId('mLatLon').textContent = `${f.lat.toFixed(5)}°N, ${f.lon.toFixed(5)}°E`;
  byId('mCo2e').textContent = `${fmtKo.format(f.latest.co2eReduction)} tCO₂e`;
  byId('mAwdStatus').textContent = awdStatus(f).label;
}

function renderDetails(f){
  byId('dFieldId').textContent = f.id;
  byId('dFarmName').textContent = f.farmName;
  byId('dArea').textContent = `${f.areaHa} ha`;
  byId('dAwdStatus').textContent = awdStatus(f).label;
  byId('dLat').textContent = `${f.lat.toFixed(6)}° N`;
  byId('dLon').textContent = `${f.lon.toFixed(6)}° E`;
  byId('dCh4').textContent = `${fmtKo.format(f.latest.ch4)} CSV units`;
  byId('dCo2e').textContent = `${fmtKo.format(f.latest.co2eReduction)} tCO₂e*`;
  byId('dNdwi').textContent = fmtKo.format(f.latest.ndwi);
  byId('dUpdate').textContent = f.latest.date;
  byId('dDataSource').textContent = f.ndwiSource || 'CSV + Sentinel-2 demo NDWI';
  byId('conversionNote').textContent = `*CO₂e uses CH₄ × ${CH4_GWP100}. Uploaded CSV CH₄ unit must be confirmed before MRV use. Current reduction uses field max CH₄ as temporary baseline.`;
  byId('mapSubtitle').textContent = `${f.id} · ${f.farmName}`;
  byId('ndwiSubtitle').textContent = f.ndwiSource || 'Demo NDWI until GEE is connected';
  byId('geeStatusChip').textContent = state.geeReady ? 'GEE connected' : 'Offline demo';
}

function awdStatus(f){
  const latest = f.latest.ndwi;
  if(latest < 0.05) return { label:'On Track', className:'ok' };
  if(latest < 0.25) return { label:'Review', className:'warn' };
  return { label:'Flooded', className:'water' };
}

function renderTable(){
  const tbody = byId('fieldTable'); tbody.innerHTML = '';
  state.data.fields.slice(0, 6).forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.id}</td><td>${f.farmName}</td><td>${f.areaHa} ha</td><td>${awdStatus(f).label}</td><td>${fmtKo.format(f.latest.ch4)}</td><td>${fmtKo.format(f.latest.ndwi)}</td><td>${f.latest.date}</td>`;
    tr.onclick = () => { state.selectedFieldId = f.id; byId('fieldSelect').value = f.id; renderAll(); };
    tbody.appendChild(tr);
  });
}

function renderMap(f){
  const aoiMeters = Number(state.config.AOI_SIDE_METERS || 500);
  const aoiBounds = boundsAround(f.lat, f.lon, aoiMeters);
  if(!state.map){
    state.map = L.map('fieldMap', {
      zoomControl:true,
      attributionControl:false,
      preferCanvas:true,
      zoomSnap:0.25,
      zoomDelta:0.25,
      minZoom: 15,
      maxZoom: 20,
      maxBoundsViscosity: 1.0,
      wheelPxPerZoomLevel: 120
    });
    L.control.attribution({prefix:false})
      .addAttribution('Imagery © Esri / Maxar | AOI overlay: Agri-I demo')
      .addTo(state.map);
    state.map.on('click', onMapClickDraw);
  }

  // Lock the view to a 500m × 500m AOI and load one static satellite image.
  // This avoids the broken mosaic / endless tile requests that can happen in restricted networks.
  state.map.setMaxBounds(aoiBounds.pad(0.05));
  state.map.fitBounds(aoiBounds, {padding:[8,8], maxZoom:18, animate:false});
  state.map.setMinZoom(Math.max(15, state.map.getZoom() - 0.75));

  if(state.baseTile) state.map.removeLayer(state.baseTile);
  const imageryUrl = buildEsriWorldImageryExportUrl(aoiBounds, Number(state.config.AOI_IMAGE_SIZE || 1024));
  state.baseTile = L.imageOverlay(imageryUrl, aoiBounds, {opacity:1, zIndex:1, interactive:false}).addTo(state.map);
  state.baseTile.on('load', () => showMapHint(`Satellite image loaded as a single ${aoiMeters}m × ${aoiMeters}m AOI image. Draw Boundary lets you trace the rice field outline manually.`));
  state.baseTile.on('error', () => showMapHint('Satellite image did not load. Network may block public imagery. The field boundary tools still work.'));

  if(state.aoiLayer) state.map.removeLayer(state.aoiLayer);
  state.aoiLayer = L.rectangle(aoiBounds, {color:'#ffffff', weight:2, dashArray:'6 6', fill:false, opacity:.95, zIndex:5}).addTo(state.map);
  if(state.aoiLabel) state.map.removeLayer(state.aoiLabel);
  const ne = aoiBounds.getNorthEast();
  state.aoiLabel = L.marker([ne.lat, ne.lng], {icon:L.divIcon({className:'aoi-label', html:`${aoiMeters}m AOI`, iconSize:null})}).addTo(state.map);

  drawFieldPolygon(f);
  setTimeout(() => state.map.invalidateSize(true), 120);
}

function buildEsriWorldImageryExportUrl(bounds, size){
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const bbox = [sw.lng, sw.lat, ne.lng, ne.lat].map(v => Number(v).toFixed(8)).join(',');
  const params = new URLSearchParams({
    bbox,
    bboxSR: '4326',
    imageSR: '4326',
    size: `${size},${size}`,
    format: 'jpg',
    transparent: 'false',
    f: 'image'
  });
  return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params.toString()}`;
}

function drawFieldPolygon(f){
  if(state.polygonLayer) state.map.removeLayer(state.polygonLayer);
  if(state.fieldLabel) state.map.removeLayer(state.fieldLabel);
  state.polygonLayer = L.polygon(f.polygon, {color:'#39e979', weight:3, fillColor:'#1baa61', fillOpacity:.34, pane:'overlayPane'}).addTo(state.map);
  state.polygonLayer.bringToFront();
  const center = polygonCentroid(f.polygon);
  state.fieldLabel = L.tooltip({permanent:false, direction:'center', className:'aoi-label'}).setContent(`${f.id}<br>${f.areaHa} ha`).setLatLng(center).addTo(state.map);
}

function renderCharts(f){
  renderLineChart('ch4Chart', 'ch4Chart', f.ch4Series.map(d=>d.date), f.ch4Series.map(d=>d.ch4), 'CH₄', '#0b6b3a', 'rgba(11,107,58,.12)');
  renderLineChart('ndwiChart', 'ndwiChart', f.ndwiSeries.map(d=>d.date), f.ndwiSeries.map(d=>d.value), 'Sentinel-2 NDWI', '#1f88d1', 'rgba(31,136,209,.14)', true);
}

function renderLineChart(canvasId, stateKey, labels, values, label, color, fillColor, zeroLine=false){
  const canvas = byId(canvasId);
  if(!canvas) return;
  if(state[stateKey]){ state[stateKey].destroy(); state[stateKey] = null; }
  const ctx = canvas.getContext('2d');
  state[stateKey] = new Chart(ctx, {
    type:'line',
    data:{ labels: labels.map(shortDate), datasets:[{ label, data:values, borderColor:color, backgroundColor:fillColor, pointBackgroundColor:'#fff', pointBorderColor:color, pointBorderWidth:2, pointRadius:3, tension:.28, fill:true }] },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      resizeDelay:150,
      plugins:{ legend:{ display:true, position:'bottom', labels:{ boxWidth:12, usePointStyle:true } }, tooltip:{ mode:'index', intersect:false } },
      scales:{
        x:{ grid:{display:false}, ticks:{ maxRotation:0, autoSkip:true, maxTicksLimit:7 } },
        y:{ beginAtZero:false, grid:{color:'#eef2ef'}, ticks:{ maxTicksLimit:6 } }
      }
    }
  });
}

function startBoundaryDraw(){
  if(!state.map) return;
  state.isDrawing = true;
  state.drawPoints = [];
  if(state.drawLayer) state.map.removeLayer(state.drawLayer);
  state.drawLayer = L.layerGroup().addTo(state.map);
  showMapHint('Click points along the rice field outline, then press Finish.');
}

function onMapClickDraw(e){
  if(!state.isDrawing || !state.drawLayer) return;
  const p = [e.latlng.lat, e.latlng.lng];
  state.drawPoints.push(p);
  L.circleMarker(p, {radius:4, color:'#fff', weight:2, fillColor:'#0b6b3a', fillOpacity:1}).addTo(state.drawLayer);
  if(state.drawPolyline) state.drawLayer.removeLayer(state.drawPolyline);
  if(state.drawPoints.length >= 2){
    state.drawPolyline = L.polyline(state.drawPoints, {color:'#fff', weight:2, dashArray:'4 4'}).addTo(state.drawLayer);
  }
}

function finishBoundaryDraw(){
  if(!state.isDrawing) return;
  const f = currentField();
  if(state.drawPoints.length < 3){
    showMapHint('At least 3 points are required.'); return;
  }
  f.polygon = state.drawPoints.slice();
  savePolygon(f.id, f.polygon);
  state.isDrawing = false;
  if(state.drawLayer){ state.map.removeLayer(state.drawLayer); state.drawLayer = null; }
  drawFieldPolygon(f);
  showMapHint('Boundary saved in this browser.');
}

function resetBoundary(){
  const f = currentField();
  removeSavedPolygon(f.id);
  f.polygon = fieldLikePolygon(f.lat, f.lon, Number(f.id.split('-').pop()) || 0);
  renderMap(f);
}

function showMapHint(text){
  const mapNote = byId('mapNote');
  if(mapNote) mapNote.textContent = text;
}

function applyGeojsonBoundary(){
  const f = currentField();
  const txt = byId('geojsonInput').value.trim();
  if(!txt){ alert('GeoJSON을 붙여넣어 주세요.'); return; }
  try{
    const geo = JSON.parse(txt);
    const geom = geo.type === 'Feature' ? geo.geometry : geo;
    if(geom.type !== 'Polygon') throw new Error('Only Polygon is supported');
    const ring = geom.coordinates[0].map(([lon, lat]) => [lat, lon]);
    f.polygon = ring;
    savePolygon(f.id, ring);
    renderMap(f);
    byId('geojsonInput').value = '';
  }catch(err){
    alert('GeoJSON Polygon 형식이 아닙니다.');
  }
}

function copyBoundaryGeojson(){
  const f = currentField();
  const ring = f.polygon.map(([lat,lon]) => [lon,lat]);
  if(ring.length && (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1])) ring.push(ring[0]);
  const geo = { type:'Feature', properties:{field_id:f.id, farm_name:f.farmName}, geometry:{ type:'Polygon', coordinates:[ring] } };
  navigator.clipboard?.writeText(JSON.stringify(geo, null, 2)).then(() => alert('Boundary GeoJSON copied.'));
}

async function connectEarthEngine(){
  saveConfigFromForm();
  if(!window.ee){ setConfigStatus('Earth Engine JS library가 로드되지 않았습니다. CDN 또는 네트워크 차단을 확인하세요.'); return; }
  if(!state.config.GOOGLE_OAUTH_CLIENT_ID){ setConfigStatus('Google OAuth Client ID가 필요합니다.'); return; }
  setConfigStatus('Authenticating Earth Engine...');
  const onSuccess = () => {
    try{
      ee.initialize(null, null, () => {
        state.geeReady = true;
        setConfigStatus('Earth Engine connected. Sentinel-2 NDWI를 불러올 수 있습니다.');
        renderDetails(currentField());
      }, err => setConfigStatus(`ee.initialize 실패: ${err}`), state.config.GEE_CLOUD_PROJECT_ID || null);
    }catch(err){ setConfigStatus(`Earth Engine 초기화 오류: ${err.message || err}`); }
  };
  const onError = err => setConfigStatus(`Earth Engine OAuth 실패: ${err}`);
  try{
    ee.data.authenticateViaOauth(
      state.config.GOOGLE_OAUTH_CLIENT_ID,
      onSuccess,
      onError,
      ['https://www.googleapis.com/auth/earthengine.readonly'],
      () => ee.data.authenticateViaPopup(onSuccess, onError)
    );
  }catch(err){ setConfigStatus(`Earth Engine 인증 오류: ${err.message || err}`); }
}

function loadSentinel2ForCurrentField(){
  if(!state.geeReady){
    connectEarthEngine();
    alert('Earth Engine 연결을 먼저 완료한 뒤 다시 Load Sentinel-2 NDWI를 눌러주세요.');
    return;
  }
  fetchSentinel2Ndwi(currentField());
}

function fetchSentinel2Ndwi(f){
  if(!window.ee || !state.geeReady){ alert('GEE 연결 후 다시 시도하세요.'); return; }
  const ringLonLat = f.polygon.map(([lat,lon]) => [lon,lat]);
  if(ringLonLat.length && (ringLonLat[0][0] !== ringLonLat[ringLonLat.length-1][0] || ringLonLat[0][1] !== ringLonLat[ringLonLat.length-1][1])) ringLonLat.push(ringLonLat[0]);
  const startDate = f.ch4Series[0]?.date || '2025-01-01';
  const endDate = addDays(f.ch4Series[f.ch4Series.length-1]?.date || '2025-12-31', 6);
  const intervals = f.ch4Series.map(d => ({start:d.date, end:addDays(d.date, 5)}));
  setConfigStatus(`Sentinel-2 NDWI loading for ${f.id}...`);
  byId('dDataSource').textContent = 'Loading Sentinel-2 via GEE...';
  try{
    const geom = ee.Geometry.Polygon([ringLonLat]);
    const collection = ee.ImageCollection(state.config.SENTINEL2_COLLECTION || 'COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(geom)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', Number(state.config.SENTINEL2_CLOUD_FILTER_PERCENT || 70)));

    const fc = ee.FeatureCollection(intervals.map(win => {
      const subset = collection.filterDate(win.start, win.end);
      const image = subset.median();
      const ndwi = image.normalizedDifference(['B3','B8']).rename('NDWI');
      const value = ndwi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: geom, scale:10, maxPixels:1e8, bestEffort:true }).get('NDWI');
      return ee.Feature(null, {date:win.start, ndwi:value});
    }));

    fc.evaluate(result => {
      if(!result || !result.features){ setConfigStatus('Sentinel-2 NDWI result was empty.'); return; }
      const series = result.features.map(ft => ({ date: ft.properties.date, value: Number(ft.properties.ndwi) }))
        .filter(d => Number.isFinite(d.value));
      if(!series.length){ setConfigStatus('Sentinel-2 NDWI values are empty, likely due to cloud cover or no imagery.'); return; }
      f.ndwiSeries = series.map(d => ({date:d.date, value: round4(d.value)}));
      f.ndwiSource = `Sentinel-2 NDWI via GEE (${state.config.SENTINEL2_COLLECTION})`;
      f.latest.ndwi = f.ndwiSeries[f.ndwiSeries.length-1].value;
      renderDetails(f); renderCharts(f); renderTable(); addSentinel2RgbLayer(f, collection, geom);
      setConfigStatus(`Sentinel-2 NDWI loaded: ${series.length} intervals.`);
    }, err => setConfigStatus(`Sentinel-2 NDWI evaluate 실패: ${err}`));
  }catch(err){
    setConfigStatus(`Sentinel-2 NDWI 오류: ${err.message || err}`);
  }
}

function addSentinel2RgbLayer(f, collection, geom){
  try{
    const image = collection.median().clip(geom);
    const rgb = image.visualize({bands:['B4','B3','B2'], min:0, max:3000, gamma:1.2});
    rgb.getMap({}, mapInfo => {
      if(!mapInfo) return;
      const url = mapInfo.urlFormat || mapInfo.tile_fetcher?.url_format;
      if(!url) return;
      if(state.geeTile) state.map.removeLayer(state.geeTile);
      state.geeTile = L.tileLayer(url, {maxZoom:20, opacity:.72, keepBuffer:0, updateWhenIdle:true, bounds: boundsAround(f.lat, f.lon, Number(state.config.AOI_SIDE_METERS || 500))}).addTo(state.map);
      if(state.polygonLayer) state.polygonLayer.bringToFront();
    });
  }catch(err){ console.warn('Sentinel-2 RGB layer failed', err); }
}

function boundsAround(lat, lon, sideMeters){
  const half = sideMeters / 2;
  const dLat = metersToLat(half);
  const dLon = metersToLon(half, lat);
  return L.latLngBounds([lat-dLat, lon-dLon], [lat+dLat, lon+dLon]);
}
function metersToLat(m){ return m / 111320; }
function metersToLon(m, lat){ return m / (111320 * Math.cos(lat * Math.PI/180)); }
function polygonCentroid(poly){ const s = poly.reduce((a,p)=>[a[0]+p[0], a[1]+p[1]], [0,0]); return [s[0]/poly.length, s[1]/poly.length]; }
function round2(n){ return Math.round(n*100)/100; }
function round4(n){ return Math.round(n*10000)/10000; }
function shortDate(d){ const dt = new Date(`${d}T00:00:00`); return dt.toLocaleDateString('en-US', {month:'short', day:'numeric'}); }
function addDays(date, days){ const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function byId(id){ return document.getElementById(id); }
function initials(name){ return String(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'AG'; }

function loadSavedPolygons(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY_POLYGONS) || '{}');}catch{return {};}}
function savePolygon(id, polygon){ const data = loadSavedPolygons(); data[id] = polygon; localStorage.setItem(STORAGE_KEY_POLYGONS, JSON.stringify(data)); }
function removeSavedPolygon(id){ const data = loadSavedPolygons(); delete data[id]; localStorage.setItem(STORAGE_KEY_POLYGONS, JSON.stringify(data)); }
