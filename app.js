const state = {
  data: null,
  selectedFieldId: null,
  map: null,
  polygonLayer: null,
  markerLayer: null,
  ch4Chart: null,
  ndwiChart: null
};

const fmt = new Intl.NumberFormat('en-US');
const fmtKo = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const GWP100_CH4_NON_FOSSIL_AR6 = 27.0;
const FIELD_NAMES = [
  'Haenam Demo Farm',
  'Gimje AWD Plot',
  'Iksan Rice Group',
  'Cheorwon Test Field',
  'Northern Rice Block',
  'AWD Trial Parcel',
  'Rice MRV Pilot Field'
];

async function loadData(){
  // No-terminal version: build the dashboard directly in the browser from CSV.
  // To update CH4 values later, replace data/ch4_predictions.csv in GitHub only.
  const csvRes = await fetch('data/ch4_predictions.csv');
  if(!csvRes.ok) throw new Error('data/ch4_predictions.csv not found');
  const csvText = await csvRes.text();
  state.data = buildDataFromCsv(csvText);
  state.selectedFieldId = state.data.fields[0]?.id;
  populateFieldSelect();
  renderAll();
}

function parseCsv(text){
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = (values[i] ?? '').trim());
    return row;
  });
}

function splitCsvLine(line){
  const out = [];
  let cur = '';
  let inQuotes = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch === '"'){
      if(inQuotes && line[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if(ch === ',' && !inQuotes){
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function buildDataFromCsv(csvText){
  const rows = parseCsv(csvText)
    .map(r => ({
      lat: Number(r['위도'] ?? r['lat'] ?? r['latitude']),
      lon: Number(r['경도'] ?? r['lon'] ?? r['longitude']),
      start: r['시작시간'] ?? r['start'] ?? r['date'],
      end: r['종료시간'] ?? r['end'] ?? '',
      ch4: Number(r['CH4_추정량'] ?? r['ch4'] ?? r['CH4'])
    }))
    .filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lon) && r.start && Number.isFinite(r.ch4));

  const groups = new Map();
  rows.forEach(r => {
    const key = `${r.lat.toFixed(6)},${r.lon.toFixed(6)}`;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  const fields = Array.from(groups.entries()).map(([key, group], idx) => {
    const [lat, lon] = key.split(',').map(Number);
    group.sort((a,b) => new Date(a.start) - new Date(b.start));
    const rawSeries = group.map(r => ({ date: r.start, ch4: round4(r.ch4) }));
    const ch4Series = interpolateFiveDay(rawSeries);
    const maxCh4 = Math.max(...ch4Series.map(d => d.ch4));
    const minCh4 = Math.min(...ch4Series.map(d => d.ch4));
    ch4Series.forEach(d => {
      // Demo reduction uses the field's max observed CH4 as a temporary baseline.
      // Replace this baseline with a validated baseline for actual MRV reporting.
      d.co2e_reduction = round4(Math.max(0, maxCh4 - d.ch4) * GWP100_CH4_NON_FOSSIL_AR6);
    });
    const waterIndexSeries = ch4Series.map(d => ({
      date: d.date,
      // Sentinel-1 live data is not available on GitHub Pages.
      // This is a display proxy so the UI can run without backend/API keys.
      // Replace with data from Earth Engine/Sentinel Hub when available.
      value: round4(ch4ToS1WaterProxy(d.ch4, minCh4, maxCh4))
    }));
    const latest = ch4Series[ch4Series.length - 1] || {date:'-', ch4:0, co2e_reduction:0};
    const latestWater = waterIndexSeries[waterIndexSeries.length - 1] || {value:0};
    const areaHa = round2(2.4 + (idx * 1.17) % 4.8);
    return {
      id: `KR-RICE-${String(idx+1).padStart(3, '0')}`,
      farmName: FIELD_NAMES[idx % FIELD_NAMES.length],
      areaHa,
      crop: 'Rice (AWD)',
      lat,
      lon,
      polygon: roughPolygon(lat, lon, idx),
      ch4Series,
      waterIndexSeries,
      latest: {
        date: latest.date,
        ch4: latest.ch4,
        co2eReduction: latest.co2e_reduction,
        waterIndex: latestWater.value
      }
    };
  });

  const estimatedCo2eReduction = fields.reduce((sum, f) => sum + (f.latest.co2eReduction || 0), 0);
  return {
    kpis: {
      participatingFarms: fields.length,
      monitoredParcels: fields.length,
      managedHectares: round2(fields.reduce((sum, f) => sum + f.areaHa, 0)),
      estimatedCo2eReduction: round2(estimatedCo2eReduction),
      gwp100_ch4: GWP100_CH4_NON_FOSSIL_AR6,
      conversionNote: 'CO₂e = CH₄ mass × 27.0, using IPCC AR6 100-year GWP for non-fossil methane. CH₄ units follow the uploaded CSV. Demo reduction uses field max CH₄ as baseline until a validated baseline is set.'
    },
    fields
  };
}

function interpolateFiveDay(rawSeries){
  const points = rawSeries.map(d => ({ t: new Date(d.date + 'T00:00:00').getTime(), date: d.date, ch4: d.ch4 })).sort((a,b)=>a.t-b.t);
  if(points.length <= 1) return rawSeries;
  const start = points[0].t;
  const end = points[points.length - 1].t;
  const step = 5 * 24 * 60 * 60 * 1000;
  const out = [];
  for(let t = start; t <= end + 1; t += step){
    let left = points[0], right = points[points.length - 1];
    for(let i=0;i<points.length-1;i++){
      if(points[i].t <= t && t <= points[i+1].t){ left = points[i]; right = points[i+1]; break; }
    }
    let ch4 = left.ch4;
    if(right.t !== left.t){
      const ratio = (t - left.t) / (right.t - left.t);
      ch4 = left.ch4 + ratio * (right.ch4 - left.ch4);
    }
    out.push({ date: new Date(t).toISOString().slice(0,10), ch4: round4(ch4) });
  }
  return out;
}

function ch4ToS1WaterProxy(ch4, minCh4, maxCh4){
  if(maxCh4 === minCh4) return 0;
  const normalized = (ch4 - minCh4) / (maxCh4 - minCh4);
  // Normalize to a familiar NDWI-like visual range for a presentation dashboard.
  return -0.45 + normalized * 1.05;
}

function roughPolygon(lat, lon, idx){
  const dlat = 0.015 + (idx % 3) * 0.002;
  const dlon = 0.020 + (idx % 2) * 0.003;
  return [
    [lat + dlat, lon - dlon],
    [lat + dlat * 0.8, lon + dlon * 0.7],
    [lat - dlat * 0.6, lon + dlon],
    [lat - dlat, lon - dlon * 0.5],
    [lat + dlat, lon - dlon]
  ];
}

function populateFieldSelect(){
  const select = document.getElementById('fieldSelect');
  select.innerHTML = '';
  state.data.fields.forEach(f => {
    const option = document.createElement('option');
    option.value = f.id;
    option.textContent = `${f.id} · ${f.farmName}`;
    select.appendChild(option);
  });
  select.value = state.selectedFieldId;
  select.onchange = e => {
    state.selectedFieldId = e.target.value;
    renderAll();
  };
}

function currentField(){
  return state.data.fields.find(f => f.id === state.selectedFieldId) || state.data.fields[0];
}

function renderAll(){
  const f = currentField();
  renderKpis();
  renderMobileHero(f);
  renderDetails(f);
  renderTable();
  renderMap(f);
  renderCharts(f);
}

function renderKpis(){
  const k = state.data.kpis;
  document.getElementById('kpiFarms').textContent = fmt.format(k.participatingFarms);
  document.getElementById('kpiParcels').textContent = fmt.format(k.monitoredParcels);
  document.getElementById('kpiHectares').textContent = `${fmtKo.format(k.managedHectares)} ha`;
  document.getElementById('kpiCo2e').textContent = `${fmtKo.format(k.estimatedCo2eReduction)} tCO₂e`;
}

function renderMobileHero(f){
  document.getElementById('mFieldName').textContent = f.farmName;
  document.getElementById('mFieldMeta').textContent = `${f.id} · ${f.areaHa} ha`;
  document.getElementById('mLatLon').textContent = `${f.lat.toFixed(5)}°N, ${f.lon.toFixed(5)}°E`;
  document.getElementById('mCo2e').textContent = `${fmtKo.format(f.latest.co2eReduction)} tCO₂e`;
}

function renderDetails(f){
  document.getElementById('dFieldId').textContent = f.id;
  document.getElementById('dFarmName').textContent = f.farmName;
  document.getElementById('dArea').textContent = `${f.areaHa} ha`;
  document.getElementById('dCrop').textContent = f.crop;
  document.getElementById('dLat').textContent = `${f.lat.toFixed(6)}° N`;
  document.getElementById('dLon').textContent = `${f.lon.toFixed(6)}° E`;
  document.getElementById('dCh4').textContent = `${fmtKo.format(f.latest.ch4)} CH₄ units`;
  document.getElementById('dCo2e').textContent = `${fmtKo.format(f.latest.co2eReduction)} tCO₂e*`;
  document.getElementById('dUpdate').textContent = f.latest.date;
  document.getElementById('conversionNote').textContent = state.data.kpis.conversionNote;
  document.getElementById('mapSubtitle').textContent = `${f.id} · ${f.farmName}`;
}

function renderTable(){
  const tbody = document.getElementById('fieldTable');
  tbody.innerHTML = '';
  state.data.fields.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.id}</td>
      <td>${f.farmName}</td>
      <td>${f.areaHa} ha</td>
      <td><span class="status-small">Active</span></td>
      <td>${fmtKo.format(f.latest.ch4)}</td>
      <td>${fmtKo.format(f.latest.waterIndex)}</td>
      <td>${f.latest.date}</td>`;
    tr.addEventListener('click', () => {
      state.selectedFieldId = f.id;
      document.getElementById('fieldSelect').value = f.id;
      renderAll();
    });
    tbody.appendChild(tr);
  });
}

function renderMap(f){
  if(!state.map){
    state.map = L.map('fieldMap', { zoomControl: false, attributionControl: true }).setView([f.lat, f.lon], 14);
    L.control.zoom({ position:'topleft' }).addTo(state.map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri, Earthstar Geographics'
    }).addTo(state.map);
  }
  if(state.polygonLayer) state.map.removeLayer(state.polygonLayer);
  if(state.markerLayer) state.map.removeLayer(state.markerLayer);
  const latlngs = f.polygon.map(p => [p[0], p[1]]);
  state.polygonLayer = L.polygon(latlngs, {
    color:'#35e36d',
    fillColor:'#0f8742',
    fillOpacity:.38,
    weight:3
  }).addTo(state.map);
  state.markerLayer = L.marker([f.lat, f.lon]).addTo(state.map).bindPopup(`<b>${f.id}</b><br>${f.farmName}<br>${f.areaHa} ha`);
  state.map.fitBounds(state.polygonLayer.getBounds(), { padding:[24,24] });
  setTimeout(()=>state.map.invalidateSize(), 150);
}

function renderCharts(f){
  const labels = f.ch4Series.map(x => shortDate(x.date));
  const ch4Values = f.ch4Series.map(x => x.ch4);
  const co2Values = f.ch4Series.map(x => x.co2e_reduction);
  const waterValues = f.waterIndexSeries.map(x => x.value);

  const ch4Ctx = document.getElementById('ch4Chart');
  const ndwiCtx = document.getElementById('ndwiChart');

  const commonOptions = {
    responsive:true,
    maintainAspectRatio:false,
    interaction:{mode:'index', intersect:false},
    plugins:{
      legend:{display:false},
      tooltip:{backgroundColor:'#10231b', padding:12, titleFont:{weight:'700'}}
    },
    scales:{
      x:{grid:{display:false}, ticks:{maxTicksLimit:8, color:'#52665b'}},
      y:{grid:{color:'#edf2ef'}, ticks:{color:'#52665b'}}
    }
  };

  if(state.ch4Chart) state.ch4Chart.destroy();
  state.ch4Chart = new Chart(ch4Ctx, {
    type:'line',
    data:{ labels, datasets:[{
      label:'CH₄ estimate', data:ch4Values, borderColor:'#0b7a43', backgroundColor:'rgba(11,122,67,.12)', fill:true, tension:.35, pointRadius:3, pointHoverRadius:5, borderWidth:2.5
    },{
      label:'CO₂e reduction', data:co2Values, borderColor:'#7bbf59', hidden:true, tension:.35
    }]},
    options:{...commonOptions, plugins:{...commonOptions.plugins, tooltip:{...commonOptions.plugins.tooltip, callbacks:{label:(ctx)=>`${ctx.dataset.label}: ${fmtKo.format(ctx.parsed.y)}`}}}}
  });

  if(state.ndwiChart) state.ndwiChart.destroy();
  state.ndwiChart = new Chart(ndwiCtx, {
    type:'line',
    data:{ labels, datasets:[{
      label:'S1 water index proxy', data:waterValues, borderColor:'#1d8ed5', backgroundColor:'rgba(29,142,213,.13)', fill:true, tension:.35, pointRadius:3, pointHoverRadius:5, borderWidth:2.5
    }]},
    options:{...commonOptions, scales:{...commonOptions.scales, y:{...commonOptions.scales.y, suggestedMin:-0.6, suggestedMax:0.8}}}
  });
}

function shortDate(dateString){
  const d = new Date(dateString + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function round2(x){ return Math.round(x * 100) / 100; }
function round4(x){ return Math.round(x * 10000) / 10000; }

document.getElementById('reportButton').addEventListener('click', () => {
  const f = currentField();
  alert(`MRV report mockup for ${f.id}\n\nThis MVP can connect to a PDF generator later.`);
});

loadData().catch(err => {
  console.error(err);
  document.body.innerHTML = `<div style="padding:32px;font-family:sans-serif"><h1>Data load error</h1><p>${err.message}</p><p>If you opened this file directly, use GitHub Pages or the Colab notebook instead.</p></div>`;
});
