(function () {
  'use strict';

  const DATA = window.AGRII_DATA;
  const GEE_CONFIG = window.AGRII_GEE_CONFIG || { enabled: false };
  const app = document.getElementById('app');
  const pageTitle = document.getElementById('pageTitle');
  const resetDemoBtn = document.getElementById('resetDemoBtn');
  const toastEl = document.getElementById('toast');
  const modalRoot = document.getElementById('modalRoot');
  const datasetStatus = document.getElementById('datasetStatus');

  const statusMeta = {
    AWD_GOOD: { label: 'On Track', short: 'Good', className: 'status-good', color: '#0f8f59', marker: 'good' },
    WATCH: { label: 'Watch', short: 'Watch', className: 'status-watch', color: '#e2a229', marker: 'watch' },
    RISK: { label: 'Risk', short: 'Risk', className: 'status-risk', color: '#d94a4a', marker: 'risk' },
    MISSING: { label: 'Missing', short: 'Missing', className: 'status-missing', color: '#8b9891', marker: 'missing' }
  };

  const evidenceMeta = {
    SATELLITE_OBSERVATION: { label: '위성 관측', icon: '🛰️' },
    WEATHER_SERIES: { label: '기상 데이터', icon: '🌦️' },
    FARMER_ACTIVITY_LOG: { label: '농가 활동 기록', icon: '📝' },
    FIELD_PHOTO: { label: '현장 사진', icon: '📷' },
    POLYGON_BOUNDARY: { label: '필지 경계', icon: '▱' }
  };

  const titleMap = {
    '': 'Agri-I AWD dMRV',
    dashboard: 'Dashboard',
    'data-processing': 'Data Processing',
    monitoring: 'Monitoring',
    evidence: 'Evidence Data Room',
    'buyer-report': '바이어 리포트(Mock-Up)',
    passport: 'Product Passport(Mock-Up)',
    methodology: 'Methodology',
    readme: 'Guide'
  };

  const storageKeys = {
    selectedField: 'agrii:selectedField',
    uploadedRows: 'agrii:uploadedPredictionRows',
    dashboardMode: 'agrii:dashboardMode'
  };

  const regionMap = [
    { lat: 34.75, lon: 126.5, region: '전남 해남권', regionEn: 'Haenam cluster' },
    { lat: 35.75, lon: 126.75, region: '전북 김제권', regionEn: 'Gimje cluster' },
    { lat: 36.75, lon: 126.75, region: '충남 예산권', regionEn: 'Yesan cluster' },
    { lat: 37.0, lon: 127.0, region: '경기 평택권', regionEn: 'Pyeongtaek cluster' },
    { lat: 38.0, lon: 127.25, region: '강원 철원권', regionEn: 'Cheorwon cluster' }
  ];

  const uploadedRows = loadJson(storageKeys.uploadedRows, null);
  let dataset = uploadedRows ? buildDatasetFromRows(uploadedRows, 'Uploaded CSV in browser localStorage') : buildDatasetFromStaticData();

  const state = {
    route: 'dashboard',
    dashboardMode: localStorage.getItem(storageKeys.dashboardMode) || 'home',
    selectedFieldId: localStorage.getItem(storageKeys.selectedField) || dataset.fields[0].parcelId,
    fieldSearch: { dashboard: '', monitoring: '', evidence: '' },
    dataSearch: '',
    selectedLotId: dataset.buyerLots[0]?.lotId || 'LOT-2025-AWD-001'
  };

  function loadJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
    catch (error) { return fallback; }
  }

  function routeFromHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    return raw || 'dashboard';
  }

  function htmlEscape(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatNumber(value, digits = 0) {
    const number = Number(value) || 0;
    return number.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  function compactId(id) {
    return String(id).replace('FIELD-', 'F-');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function statusBadge(status) {
    const meta = statusMeta[status] || statusMeta.MISSING;
    return `<span class="status-pill ${meta.className}">${meta.label}</span>`;
  }

  function evidenceBadge(status) {
    const map = {
      COLLECTED: ['수집됨', 'status-good'],
      REVIEWED: ['검토 완료', 'status-good'],
      NEEDS_REVIEW: ['검토 필요', 'status-watch'],
      MISSING: ['미수집', 'status-missing']
    };
    const item = map[status] || map.MISSING;
    return `<span class="badge ${item[1]}">${item[0]}</span>`;
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastEl._timer);
    toastEl._timer = window.setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function updateDatasetStatus() {
    datasetStatus.textContent = `${dataset.fields.length} fields · ${dataset.predictions.length} rows`;
  }

  function setSelectedField(parcelId, mode) {
    if (!dataset.fields.some((field) => field.parcelId === parcelId)) return;
    state.selectedFieldId = parcelId;
    if (mode) {
      state.dashboardMode = mode;
      localStorage.setItem(storageKeys.dashboardMode, mode);
    }
    localStorage.setItem(storageKeys.selectedField, parcelId);
    render();
  }

  function getField(id = state.selectedFieldId) {
    return dataset.fields.find((field) => field.parcelId === id) || dataset.fields[0];
  }

  function getPredictions(parcelId = state.selectedFieldId) {
    return dataset.predictions.filter((row) => row.parcelId === parcelId).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function getClimate(parcelId = state.selectedFieldId) {
    return dataset.climate.filter((row) => row.parcelId === parcelId).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function getEvidence(parcelId = state.selectedFieldId) {
    return dataset.evidence.filter((row) => row.parcelId === parcelId);
  }

  function getSummary() {
    const fields = dataset.fields;
    const totalArea = fields.reduce((sum, field) => sum + Number(field.areaHa || 0), 0);
    const totalCh4 = fields.reduce((sum, field) => sum + Number(field.totalCh4 || 0), 0);
    const totalTco2e = fields.reduce((sum, field) => sum + Number(field.estimatedReductionTco2e || 0), 0);
    const riskCount = fields.filter((field) => field.status === 'RISK' || field.status === 'WATCH').length;
    const goodCount = fields.filter((field) => field.status === 'AWD_GOOD').length;
    const avgScore = fields.reduce((sum, field) => sum + Number(field.awdScoreExample || 0), 0) / Math.max(fields.length, 1);
    return { fieldCount: fields.length, totalArea, totalCh4, totalTco2e, riskCount, goodCount, avgScore, rows: dataset.predictions.length };
  }

  function filterFields(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return dataset.fields;
    return dataset.fields.filter((field) => {
      const text = `${field.parcelId} ${field.serial} ${field.region} ${field.regionEn} ${field.farmName} ${field.lat} ${field.lon}`.toLowerCase();
      return text.includes(q);
    });
  }

  function buildDatasetFromStaticData() {
    return {
      fields: DATA.fields,
      predictions: DATA.predictions,
      climate: DATA.climate,
      koreaClimateSummary: DATA.koreaClimateSummary,
      evidence: DATA.evidence,
      buyerLots: DATA.buyerLots,
      parcelsGeoJSON: DATA.parcelsGeoJSON,
      dataSourceLabel: DATA.sources.ch4Predictions.path,
      isUploaded: false
    };
  }

  function buildDatasetFromRows(rows, sourceLabel) {
    const cleanRows = rows
      .map((row) => ({
        lat: Number(row.lat),
        lon: Number(row.lon),
        startTime: String(row.startTime),
        endTime: String(row.endTime),
        ch4Estimated: Number(row.ch4Estimated)
      }))
      .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.startTime && row.endTime && Number.isFinite(row.ch4Estimated))
      .sort((a, b) => `${a.lat}|${a.lon}|${a.startTime}|${a.endTime}`.localeCompare(`${b.lat}|${b.lon}|${b.startTime}|${b.endTime}`));

    const grouped = new Map();
    cleanRows.forEach((row) => {
      const key = `${row.lat.toFixed(6)}|${row.lon.toFixed(6)}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    const aggregates = Array.from(grouped.entries()).map(([key, group]) => {
      const sum = group.reduce((acc, row) => acc + row.ch4Estimated, 0);
      const mean = sum / Math.max(group.length, 1);
      return { key, group, mean, sum };
    });
    const minMean = Math.min(...aggregates.map((item) => item.mean));
    const maxMean = Math.max(...aggregates.map((item) => item.mean));

    const fields = [];
    const predictions = [];
    const climate = [];
    const evidence = [];
    const features = [];

    aggregates.sort((a, b) => {
      const [aLat, aLon] = a.key.split('|').map(Number);
      const [bLat, bLon] = b.key.split('|').map(Number);
      return aLat - bLat || aLon - bLon;
    }).forEach((item, index) => {
      const group = item.group.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const lat = group[0].lat;
      const lon = group[0].lon;
      const fieldId = `FIELD-${String(index + 1).padStart(3, '0')}`;
      const serial = String(index + 1).padStart(3, '0');
      const region = inferRegion(lat, lon, index).region;
      const regionEn = inferRegion(lat, lon, index).regionEn;
      const values = group.map((row) => row.ch4Estimated);
      const mean = item.mean;
      const total = item.sum;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const latest = group[group.length - 1];
      const score = maxMean > minMean ? Math.round(55 + 35 * ((maxMean - mean) / (maxMean - minMean))) : 80;
      const status = score >= 75 ? 'AWD_GOOD' : (score >= 60 ? 'WATCH' : 'RISK');
      const areaHa = 0.5;
      const tco2e = total * 28 / 1000;
      const polygon = rectanglePolygon(lon, lat, 100, 50);
      let latestNdwi = 0;

      group.forEach((row, rowIndex) => {
        const date = new Date(`${row.startTime}T00:00:00`);
        const day = getDayOfYear(date);
        const ndwi = clamp(0.50 - 0.42 * (row.ch4Estimated / Math.max(max, 1)) + 0.07 * Math.sin(((day + index * 23) / 365) * Math.PI * 2), -0.12, 0.68);
        latestNdwi = rowIndex === group.length - 1 ? ndwi : latestNdwi;
        predictions.push({
          parcelId: fieldId,
          lat,
          lon,
          startTime: row.startTime,
          endTime: row.endTime,
          ch4Estimated: Number(row.ch4Estimated.toFixed(6)),
          ch4UnitLabel: 'CSV model output',
          co2eProxyTons: Number((row.ch4Estimated * 28 / 1000).toFixed(6)),
          ndwiProxy: Number(ndwi.toFixed(4)),
          waterStatusProxy: ndwi < 0.18 ? 'DRY' : (ndwi < 0.35 ? 'TRANSITION' : 'FLOODED'),
          key: `${lat.toFixed(6)}|${lon.toFixed(6)}|${row.startTime}|${row.endTime}`
        });
        climate.push(generateClimateRow(fieldId, lat, lon, row.startTime, row.endTime, rowIndex, index));
      });

      const props = {
        parcelId: fieldId,
        serial,
        farmerCode: `F-${serial}`,
        region,
        regionEn,
        farmName: `${region} AWD 분석 부지 ${serial}`,
        areaHa,
        footprint: '100m x 50m demo footprint',
        crop: 'rice',
        status,
        awdScoreExample: score,
        awdScoreTag: 'for example',
        evidenceRate: status === 'AWD_GOOD' ? 92 : (status === 'WATCH' ? 76 : 58),
        buyerCandidate: index % 2 === 1,
        lat,
        lon,
        observationCount: group.length,
        meanCh4: Number(mean.toFixed(4)),
        totalCh4: Number(total.toFixed(4)),
        minCh4: Number(min.toFixed(4)),
        maxCh4: Number(max.toFixed(4)),
        latestCh4CsvUnits: Number(latest.ch4Estimated.toFixed(4)),
        estimatedReductionTco2e: Number(tco2e.toFixed(4)),
        baselineTco2eExample: Number((tco2e * 1.42 + 0.1).toFixed(4)),
        latestNdwiProxy: Number(latestNdwi.toFixed(4)),
        dataSource: sourceLabel,
        climateSource: 'data/climate_observations.csv equivalent in browser',
        satelliteSource: DATA.sources.satellite.attribution,
        lastUpdate: latest.endTime,
        notes: '위경도·시간·CH4_추정량 기반 CSV 업로드 데모. 실제 필지 경계·농가정보는 익명화/대체 필요.'
      };
      fields.push(props);
      features.push({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [polygon] } });
      evidence.push(...generateEvidenceRows(props));
    });

    return {
      fields,
      predictions,
      climate,
      koreaClimateSummary: DATA.koreaClimateSummary,
      evidence,
      buyerLots: [{ lotId: 'LOT-UPLOADED-AWD-001', name: 'Uploaded CSV AWD 분석 Lot', parcelIds: fields.map((field) => field.parcelId), region: '업로드 CSV 위치', volumeTon: fields.length * 2.5, estimatedReductionTco2e: Number(fields.reduce((sum, f) => sum + f.estimatedReductionTco2e, 0).toFixed(3)), reportStatus: 'Mock-Up Ready' }],
      parcelsGeoJSON: { type: 'FeatureCollection', features },
      dataSourceLabel: sourceLabel,
      isUploaded: sourceLabel.includes('Uploaded')
    };
  }

  function inferRegion(lat, lon, fallbackIndex) {
    const found = regionMap.find((item) => Math.abs(item.lat - lat) < 0.011 && Math.abs(item.lon - lon) < 0.011);
    if (found) return { region: found.region, regionEn: found.regionEn };
    if (lat >= 37.7) return { region: '강원/경기 북부권', regionEn: 'Northern Korea cluster' };
    if (lat >= 36.6) return { region: '충청권', regionEn: 'Chungcheong cluster' };
    if (lat >= 35.4) return { region: '전북권', regionEn: 'Jeonbuk cluster' };
    if (lat >= 34.3) return { region: '전남권', regionEn: 'Jeonnam cluster' };
    return { region: `업로드 위치 ${fallbackIndex + 1}`, regionEn: `Uploaded location ${fallbackIndex + 1}` };
  }

  function rectanglePolygon(lon, lat, widthM, heightM) {
    const halfW = widthM / 2;
    const halfH = heightM / 2;
    const dLat = halfH / 110574;
    const dLon = halfW / (111320 * Math.cos(lat * Math.PI / 180));
    return [[lon - dLon, lat - dLat], [lon + dLon, lat - dLat], [lon + dLon, lat + dLat], [lon - dLon, lat + dLat], [lon - dLon, lat - dLat]];
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  function generateClimateRow(parcelId, lat, lon, startTime, endTime, rowIndex, fieldIndex) {
    const date = new Date(`${startTime}T00:00:00`);
    const day = getDayOfYear(date);
    const temp = 12.5 + 13.2 * Math.sin(((day - 82) / 365) * Math.PI * 2) - 0.55 * (lat - 36) + 0.8 * Math.sin(rowIndex * 1.7 + fieldIndex);
    const rain = Math.max(0, 3.5 + 10.5 * Math.sin(((day - 160) / 365) * Math.PI * 2) + 4.0 * Math.sin(rowIndex * 0.83 + fieldIndex) + (fieldIndex % 3) * 0.8);
    return {
      parcelId,
      lat,
      lon,
      startTime,
      endTime,
      temperatureC: Number(temp.toFixed(2)),
      rainfallMm: Number(rain.toFixed(2)),
      normalTemperatureC: Number((temp - 0.6 + 0.5 * Math.sin(rowIndex * 0.29)).toFixed(2)),
      previousYearTemperatureC: Number((temp + 0.4 * Math.cos(rowIndex * 0.19)).toFixed(2)),
      normalRainfallMm: Number(Math.max(0, rain * 0.88 + 1.2 * Math.sin(rowIndex * 0.4)).toFixed(2)),
      previousYearRainfallMm: Number(Math.max(0, rain * 1.08 + 1.4 * Math.cos(rowIndex * 0.31)).toFixed(2)),
      source: 'Demo climate CSV; replace with Copernicus ERA5 single-levels or KMA ASOS/AWS',
      dataPath: 'data/climate_observations.csv'
    };
  }

  function generateEvidenceRows(field) {
    const statusMap = {
      AWD_GOOD: ['REVIEWED', 'COLLECTED', 'REVIEWED', 'COLLECTED', 'REVIEWED'],
      WATCH: ['COLLECTED', 'COLLECTED', 'NEEDS_REVIEW', 'MISSING', 'REVIEWED'],
      RISK: ['NEEDS_REVIEW', 'COLLECTED', 'NEEDS_REVIEW', 'MISSING', 'COLLECTED']
    };
    const [satellite, weather, log, photo, boundary] = statusMap[field.status] || statusMap.WATCH;
    const rows = [
      ['SATELLITE_OBSERVATION', satellite, 'Sentinel-2 cloudless 2024 / optional GEE Sentinel-2 SR'],
      ['WEATHER_SERIES', weather, 'data/climate_observations.csv; target source ERA5 or KMA ASOS/AWS'],
      ['FARMER_ACTIVITY_LOG', log, 'Demo activity log; replace with field record'],
      ['FIELD_PHOTO', photo, 'Demo placeholder; no upload storage on GitHub Pages'],
      ['POLYGON_BOUNDARY', boundary, '100m x 50m generated footprint from CSV lat/lon']
    ];
    return rows.map(([evidenceType, status, source]) => ({ parcelId: field.parcelId, evidenceType, status, date: field.lastUpdate, source, confidence: status === 'REVIEWED' ? 'HIGH' : (status === 'COLLECTED' ? 'MEDIUM' : 'LOW') }));
  }

  function render() {
    if (!dataset.fields.length) dataset = buildDatasetFromStaticData();
    if (!dataset.fields.some((field) => field.parcelId === state.selectedFieldId)) state.selectedFieldId = dataset.fields[0].parcelId;
    state.route = routeFromHash();
    pageTitle.textContent = titleMap[state.route] || titleMap.dashboard;
    updateNav();
    updateDatasetStatus();

    const renderers = {
      '': renderLanding,
      dashboard: renderDashboard,
      'data-processing': renderDataProcessing,
      monitoring: renderMonitoring,
      evidence: renderEvidence,
      'buyer-report': renderBuyerReport,
      passport: renderPassport,
      methodology: renderMethodology,
      readme: renderGuide
    };

    const renderer = renderers[state.route] || renderDashboard;
    app.innerHTML = renderer();
  }

  function updateNav() {
    document.querySelectorAll('[data-route]').forEach((el) => {
      const key = el.getAttribute('data-route');
      el.classList.toggle('active', key === state.route);
    });
  }

  function renderLanding() {
    const summary = getSummary();
    return `
      <section class="card hero">
        <div class="hero-copy">
          <p class="eyebrow">Agri-I Prototype</p>
          <h2>AWD 기반<br />저탄소 쌀 dMRV<br />운영 대시보드</h2>
          <p>
            <code>ch4_predictions.csv</code>의 위경도·시간·CH4 추정량을 기반으로 필지 수, 감축량, 모니터링 결과를 갱신하는 GitHub Pages 정적 웹 프로토타입입니다.
          </p>
          <div class="button-row">
            <a class="btn" href="#/dashboard">Dashboard 열기</a>
            <a class="btn secondary" href="#/data-processing">CSV 업로드</a>
            <a class="btn secondary" href="#/buyer-report">바이어 리포트(Mock-Up)</a>
          </div>
          <div class="callout warning mt-18">
            현재 구현 범위는 AWD 기반 필지 모니터링 대시보드입니다. AWD Score는 실제 인증 점수가 아니라 CSV 기반 상대지표로 계산한 <strong>AWD Score (for example)</strong>입니다.
          </div>
        </div>
        <div class="hero-visual">
          <div class="mock-window">
            <div class="card-header">
              <div>
                <h3>CSV-driven overview</h3>
                <p class="subtle mt-6">No server · no DB · optional GEE only</p>
              </div>
              ${statusBadge(summary.riskCount ? 'WATCH' : 'AWD_GOOD')}
            </div>
            <div class="satellite-frame" style="min-height: 305px;">${renderSatelliteTileMap({ centerLat: 36.4, centerLon: 127.8, zoom: 6, markers: dataset.fields, mode: 'home' })}</div>
            <div class="grid three mt-14">
              ${miniMetric(`${formatNumber(summary.fieldCount)}개`, 'CSV 고유 위치')}
              ${miniMetric(`${formatNumber(summary.totalTco2e, 1)}t`, 'CO₂e 환산 예시')}
              ${miniMetric(`${formatNumber(summary.rows)}행`, 'CH4 예측 행')}
            </div>
          </div>
        </div>
      </section>
      <section class="grid three">
        ${featureCard('Data Processing', '동일 구조 CSV를 업로드하고 위도·경도·시간 Key 중복을 관리자 선택으로 처리합니다.', '⇪')}
        ${featureCard('Dashboard Home/Search Result', 'Home은 한반도 전체 Sentinel-2 위성뷰, Search Result는 선택 부지 100m×50m 위성뷰를 보여줍니다.', '▦')}
        ${featureCard('Monitoring & Evidence', '필드 선택은 검색형으로 바꾸어 수천 개 필지 확장에 대비했습니다.', '⌁')}
      </section>
    `;
  }

  function featureCard(title, body, icon) {
    return `<article class="card pad"><div class="step-num">${icon}</div><h3>${title}</h3><p class="subtle mt-10">${body}</p></article>`;
  }

  function miniMetric(value, label) {
    return `<div class="card pad" style="box-shadow:none;"><strong style="font-size:25px;">${value}</strong><div class="subtle mt-6">${label}</div></div>`;
  }

  function renderDashboard() {
    return state.dashboardMode === 'result' ? renderDashboardResult() : renderDashboardHome();
  }

  function renderDashboardHome() {
    const summary = getSummary();
    const deficient = dataset.fields.filter((field) => field.status === 'RISK' || field.status === 'WATCH').sort((a, b) => a.awdScoreExample - b.awdScoreExample);
    return `
      ${renderKpis(summary)}
      <section class="grid dashboard">
        <div class="grid">
          <article class="card pad">
            <div class="card-header">
              <div>
                <h2>Satellite View · Home</h2>
                <p class="subtle mt-6">한반도 전체 Sentinel-2 Cloudless 위성뷰에서 CSV 위치를 표시합니다.</p>
              </div>
              <span class="tag">Sentinel-2</span>
            </div>
            <div class="satellite-frame">${renderSatelliteTileMap({ centerLat: 36.4, centerLon: 127.8, zoom: 6, markers: dataset.fields, mode: 'home' })}</div>
            <p class="map-caption">Source: ${htmlEscape(DATA.sources.satellite.attribution)}. GEE live mode is optional and disabled by default.</p>
            ${renderLegend()}
          </article>
          <section class="grid two">
            <article class="card pad">
              <h3>한국 기후 데이터 · 평년 vs 예년</h3>
              <p class="subtle mt-6">위치: <code>data/korea_climate_summary.csv</code> · 출처: 데모 CSV, 실제 전환 대상은 KMA 기후평년/ASOS 또는 ERA5 집계</p>
              <div class="chart-box">${dualLineChart(dataset.koreaClimateSummary, 'month', 'normalTemperatureC', 'previousYearTemperatureC', { labelA: '평년 기온', labelB: '예년 기온', unit: '°C', colorA: '#0f8f59', colorB: '#e2a229' })}</div>
            </article>
            <article class="card pad">
              <h3>한국 강수 데이터 · 평년 vs 예년</h3>
              <p class="subtle mt-6">위치: <code>data/korea_climate_summary.csv</code> · 출처 표기 포함</p>
              <div class="chart-box">${dualLineChart(dataset.koreaClimateSummary, 'month', 'normalRainfallMm', 'previousYearRainfallMm', { labelA: '평년 강수', labelB: '예년 강수', unit: 'mm', colorA: '#2f8edb', colorB: '#e2a229' })}</div>
            </article>
          </section>
          <article class="card pad">
            <div class="card-header">
              <div>
                <h2>AWD 이행이 부족한 부지</h2>
                <p class="subtle mt-6">AWD Score (for example)가 낮은 부지를 우선 점검 대상으로 표시합니다.</p>
              </div>
              <a class="btn secondary small" href="#/monitoring">Monitoring 열기</a>
            </div>
            ${renderFieldTable(deficient.length ? deficient : dataset.fields.slice(0, 5), { compact: true })}
          </article>
        </div>
        <aside class="card details-panel">
          <h2>부지 검색</h2>
          <p class="subtle mt-6">지역, 일련번호, 위도, 경도로 검색합니다. 결과 선택 시 Dashboard가 Search Result 형태로 전환됩니다.</p>
          ${renderFieldSearch('dashboard', 'Search field by region, serial, latitude, longitude')}
          <div class="callout info mt-18">
            <strong>Home 정보</strong><br />전체 추정 감축량, 전체 관리 면적, AWD 점검 대상, 한국 평년/예년 기후 데이터를 요약합니다.
          </div>
          <div class="detail-list mt-18">
            ${detailRow('CSV 위치 수', `${formatNumber(summary.fieldCount)}개`)}
            ${detailRow('전체 관리 면적', `${formatNumber(summary.totalArea, 2)} ha`)}
            ${detailRow('전체 CH4 추정량', `${formatNumber(summary.totalCh4, 2)} CSV units`)}
            ${detailRow('CO₂e 환산 예시', `${formatNumber(summary.totalTco2e, 2)} tCO₂e`)}
            ${detailRow('점검 대상', `${formatNumber(summary.riskCount)}개`)}
          </div>
        </aside>
      </section>
    `;
  }

  function renderDashboardResult() {
    const field = getField();
    const predictions = getPredictions(field.parcelId);
    const climate = getClimate(field.parcelId);
    const sourceText = climate[0]?.source || 'data/climate_observations.csv';
    return `
      ${renderFieldKpis(field)}
      <section class="grid dashboard">
        <div class="grid">
          <article class="card pad">
            <div class="card-header">
              <div>
                <h2>Satellite View · Search Result</h2>
                <p class="subtle mt-6">${field.region} · ${field.parcelId} · 100m × 50m footprint</p>
              </div>
              <div class="button-row no-print">
                <button class="btn secondary small" data-action="dashboard-home">Back to Home</button>
                <button class="btn secondary small" data-route-to="monitoring">Open Monitoring</button>
              </div>
            </div>
            <div class="satellite-frame">${renderSatelliteTileMap({ centerLat: field.lat, centerLon: field.lon, zoom: 16, markers: [field], mode: 'result', footprint: true })}</div>
            <p class="map-caption">Source: ${htmlEscape(DATA.sources.satellite.attribution)}. 노란 사각형은 CSV 위경도 중심의 100m × 50m 가상 부지 범위입니다.</p>
          </article>
          <section class="grid two">
            <article class="card pad">
              <h3>CH₄ 추정량 시계열</h3>
              <p class="subtle mt-6">위치: <code>${htmlEscape(field.dataSource)}</code> · Key: 위도|경도|시작시간|종료시간</p>
              <div class="chart-box">${lineChart(predictions, 'startTime', 'ch4Estimated', { color: '#0f8f59', area: true, unit: 'CSV units' })}</div>
            </article>
            <article class="card pad">
              <h3>지역 기후 데이터 · Temperature / Rainfall</h3>
              <p class="subtle mt-6">위치: <code>data/climate_observations.csv</code> · 출처: ${htmlEscape(sourceText)}</p>
              <div class="chart-box">${dualLineChart(climate, 'startTime', 'temperatureC', 'rainfallMm', { labelA: 'Temperature', labelB: 'Rainfall', unit: '°C / mm', colorA: '#e2a229', colorB: '#2f8edb' })}</div>
            </article>
          </section>
          <article class="card pad">
            <h2>Search Result Summary</h2>
            <p class="subtle mt-6">선택 부지가 위치한 지역의 기후 데이터, 면적, 감축량, AWD 이행 상태를 요약합니다.</p>
            ${renderFieldTable([field], { compact: false })}
          </article>
        </div>
        ${renderFieldDetails(field)}
      </section>
    `;
  }

  function renderKpis(summary) {
    const kpis = [
      ['필지 수', `${formatNumber(summary.fieldCount)}개`, 'CSV 고유 위경도 수'],
      ['전체 관리 면적', `${formatNumber(summary.totalArea, 2)}ha`, '각 부지 100m×50m 가정'],
      ['전체 CH₄ 추정량', `${formatNumber(summary.totalCh4, 1)}`, 'CSV model output'],
      ['CO₂e 환산 예시', `${formatNumber(summary.totalTco2e, 1)}t`, 'CH₄×28/1000 예시'],
      ['점검 대상', `${formatNumber(summary.riskCount)}개`, 'Watch/Risk 상태']
    ];
    return `<section class="kpi-grid">${kpis.map(([label, value, foot]) => `
      <article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`).join('')}</section>`;
  }

  function renderFieldKpis(field) {
    const reductionRate = field.baselineTco2eExample ? field.estimatedReductionTco2e / field.baselineTco2eExample * 100 : 0;
    const kpis = [
      ['선택 부지', compactId(field.parcelId), field.region],
      ['부지 면적', `${formatNumber(field.areaHa, 2)}ha`, '100m×50m footprint'],
      ['AWD Score', `${field.awdScoreExample}`, '(for example)'],
      ['CH₄ 추정량', `${formatNumber(field.totalCh4, 1)}`, 'CSV model output'],
      ['감축량 환산', `${formatNumber(field.estimatedReductionTco2e, 2)}t`, `${formatNumber(reductionRate, 1)}% of baseline example`]
    ];
    return `<section class="kpi-grid">${kpis.map(([label, value, foot]) => `
      <article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`).join('')}</section>`;
  }

  function renderFieldDetails(field) {
    const reductionPct = field.baselineTco2eExample ? Math.round((field.estimatedReductionTco2e / field.baselineTco2eExample) * 100) : 0;
    return `
      <aside class="card details-panel">
        <div class="card-header">
          <div><h2>Field Details</h2><p class="subtle mt-6">${field.region} · ${field.farmerCode}</p></div>
          ${statusBadge(field.status)}
        </div>
        <div class="detail-list">
          ${detailRow('Field ID', field.parcelId)}
          ${detailRow('Serial', field.serial)}
          ${detailRow('Area', `${formatNumber(field.areaHa, 2)} ha`)}
          ${detailRow('AWD Score', `${field.awdScoreExample} / 100 `)}
          ${detailRow('Tag', 'AWD Score (for example)')}
          ${detailRow('Latitude', `${formatNumber(field.lat, 6)}° N`)}
          ${detailRow('Longitude', `${formatNumber(field.lon, 6)}° E`)}
          ${detailRow('Observations', `${formatNumber(field.observationCount)} rows`)}
          ${detailRow('Mean CH₄', `${formatNumber(field.meanCh4, 2)} CSV units`)}
          ${detailRow('Total CH₄', `${formatNumber(field.totalCh4, 2)} CSV units`)}
          ${detailRow('CO₂e Proxy', `${formatNumber(field.estimatedReductionTco2e, 2)} tCO₂e`)}
          ${detailRow('Reduction Rate', `${reductionPct}% of baseline example`)}
          ${detailRow('Climate Data', field.climateSource)}
          ${detailRow('Last Update', field.lastUpdate)}
        </div>
        <div class="button-row mt-18 no-print">
          <button class="btn" data-route-to="monitoring">Load Monitoring</button>
          <button class="btn secondary" data-download-field="${field.parcelId}">Export Field JSON</button>
        </div>
        <p class="subtle mt-14">* AI는 공식 인증을 대체하지 않고, MRV 자료 생성과 검증 비용 절감을 지원하는 보조 도구입니다.</p>
      </aside>
    `;
  }

  function detailRow(label, value) {
    return `<div class="detail-row"><span>${label}</span><strong>${htmlEscape(value)}</strong></div>`;
  }

  function renderLegend() {
    return `<div class="legend">
      ${Object.entries(statusMeta).map(([, meta]) => `<span class="legend-item"><i class="legend-dot" style="background:${meta.color}"></i>${meta.label}</span>`).join('')}
    </div>`;
  }

  function renderDataProcessing() {
    const summary = getSummary();
    const filtered = filterFields(state.dataSearch);
    return `
      <section class="grid two">
        <article class="card pad">
          <div class="card-header">
            <div>
              <h2>CH₄ Prediction CSV Upload</h2>
              <p class="subtle mt-6">기존 Parcels 패널을 Data Processing 패널로 변경했습니다. 서버 저장 없이 브라우저 localStorage에만 반영됩니다.</p>
            </div>
            <span class="tag">Key: 위도·경도·시간</span>
          </div>
          <div class="upload-box">
            <label class="field">
              <span class="label">ch4_predictions.csv와 같은 구조의 CSV 업로드</span>
              <input class="file-input" id="ch4CsvInput" type="file" accept=".csv,text/csv" />
            </label>
            <div class="schema-grid">
              ${DATA.csvSchema.map((col) => `<div class="schema-cell"><strong>${htmlEscape(col)}</strong><span class="subtle">required</span></div>`).join('')}
            </div>
            <div class="callout warning">
              중복 Key는 <code>위도|경도|시작시간|종료시간</code>입니다. 중복이 발견되면 관리자에게 중복 개수와 처리 방식을 묻는 메시지창이 표시됩니다.
            </div>
            <div class="button-row">
              <button class="btn secondary" data-action="download-normalized-csv">Normalized CSV 다운로드</button>
              <button class="btn secondary" data-action="download-climate-csv">Climate CSV 다운로드</button>
              <button class="btn danger" data-action="clear-uploaded-csv">업로드 데이터 초기화</button>
            </div>
          </div>
        </article>
        <aside class="card details-panel">
          <h2>Current Dataset</h2>
          <p class="subtle mt-6">필지 수는 CSV의 고유 위경도 위치 수로 계산됩니다.</p>
          <div class="detail-list mt-14">
            ${detailRow('Data source', dataset.dataSourceLabel)}
            ${detailRow('Prediction rows', `${formatNumber(summary.rows)} rows`)}
            ${detailRow('Unique locations', `${formatNumber(summary.fieldCount)} fields`)}
            ${detailRow('Total area', `${formatNumber(summary.totalArea, 2)} ha`)}
            ${detailRow('Total CH₄', `${formatNumber(summary.totalCh4, 2)} CSV units`)}
            ${detailRow('CO₂e proxy', `${formatNumber(summary.totalTco2e, 2)} tCO₂e`)}
          </div>
          <div class="callout info mt-18">
            <strong>기후 데이터 파일</strong><br />데모용 CSV: <code>data/climate_observations.csv</code><br />실제 전환 대상: Copernicus ERA5 single-levels 또는 기상청 ASOS/AWS.
          </div>
        </aside>
      </section>
      <article class="card pad">
        <div class="card-header">
          <div>
            <h2>Processed Fields</h2>
            <p class="subtle mt-6">검색은 위경도, 지역, 일련번호로 가능합니다.</p>
          </div>
          <label class="field" style="max-width:360px;">
            <span class="label">Search</span>
            <input type="search" data-input="data-search" value="${htmlEscape(state.dataSearch)}" placeholder="FIELD-001, 34.75, 전북, 003" />
          </label>
        </div>
        ${renderFieldTable(filtered)}
      </article>
      <article class="card pad">
        <h2>Raw Prediction Preview</h2>
        <p class="subtle mt-6">처음 20개 행만 표시합니다.</p>
        <div class="data-preview">${renderPredictionPreview(dataset.predictions.slice(0, 20))}</div>
      </article>
    `;
  }

  function renderPredictionPreview(rows) {
    return `<div class="table-wrap"><table><thead><tr><th>Field</th><th>위도</th><th>경도</th><th>시작시간</th><th>종료시간</th><th>CH₄_추정량</th><th>Key</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${row.parcelId}</td><td>${formatNumber(row.lat, 5)}</td><td>${formatNumber(row.lon, 5)}</td><td>${row.startTime}</td><td>${row.endTime}</td><td>${formatNumber(row.ch4Estimated, 4)}</td><td><code>${htmlEscape(row.key)}</code></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function renderMonitoring() {
    const field = getField();
    const predictions = getPredictions(field.parcelId);
    const climate = getClimate(field.parcelId);
    return `
      <section class="grid monitoring-layout">
        <aside class="card details-panel">
          <h2>Field Search</h2>
          <p class="subtle mt-6">수천 개 필지를 대비해 드롭다운 대신 검색형 선택 UI를 사용합니다.</p>
          ${renderFieldSearch('monitoring', '위경도, 지역, 일련번호로 검색')}
          <div class="callout info mt-18">
            <strong>검색 가능 Key</strong><br />위도, 경도, 지역명, 일련번호, Field ID
          </div>
        </aside>
        <div class="grid">
          ${renderFieldKpis(field)}
          <section class="grid two">
            <article class="card pad">
              <h3>CH₄ 추정량</h3>
              <p class="subtle mt-6">위치: <code>${htmlEscape(field.dataSource)}</code></p>
              <div class="chart-box">${lineChart(predictions, 'startTime', 'ch4Estimated', { color: '#0f8f59', area: true, unit: 'CSV units' })}</div>
            </article>
            <article class="card pad">
              <h3>NDWI Proxy · 침수/건조 판단 보조</h3>
              <p class="subtle mt-6">위성 수분지수 기반 예시. 실제 서비스에서는 Sentinel-1/2, Landsat, 현장자료로 보정합니다.</p>
              <div class="chart-box">${lineChart(predictions, 'startTime', 'ndwiProxy', { color: '#2f8edb', area: true, unit: 'NDWI proxy' })}</div>
            </article>
          </section>
          <section class="grid two">
            <article class="card pad">
              <h3>Temperature</h3>
              <p class="subtle mt-6">위치: <code>data/climate_observations.csv</code> · 출처: ${htmlEscape(climate[0]?.source || '')}</p>
              <div class="chart-box">${dualLineChart(climate, 'startTime', 'temperatureC', 'normalTemperatureC', { labelA: '관측/데모', labelB: '평년', unit: '°C', colorA: '#e2a229', colorB: '#0f8f59' })}</div>
            </article>
            <article class="card pad">
              <h3>Rainfall</h3>
              <p class="subtle mt-6">위치: <code>data/climate_observations.csv</code> · 출처: ${htmlEscape(climate[0]?.source || '')}</p>
              <div class="chart-box">${dualLineChart(climate, 'startTime', 'rainfallMm', 'normalRainfallMm', { labelA: '관측/데모', labelB: '평년', unit: 'mm', colorA: '#2f8edb', colorB: '#0f8f59' })}</div>
            </article>
          </section>
          <article class="card pad">
            <div class="card-header">
              <div>
                <h2>Flood / Dry Timeline</h2>
                <p class="subtle mt-6">NDWI proxy 기준의 시각화 예시입니다.</p>
              </div>
              ${statusBadge(field.status)}
            </div>
            ${renderTimeline(predictions)}
          </article>
        </div>
      </section>
    `;
  }

  function renderTimeline(rows) {
    return `<div class="timeline">${rows.map((row) => {
      const cls = row.waterStatusProxy === 'DRY' ? 'dry' : (row.waterStatusProxy === 'TRANSITION' ? 'transition' : 'flooded');
      return `<div class="timeline-cell ${cls}" title="${row.startTime} · ${row.waterStatusProxy} · NDWI ${row.ndwiProxy}"></div>`;
    }).join('')}</div>
    <div class="legend mt-14"><span class="legend-item"><i class="legend-dot" style="background:#f1c65c"></i>Dry</span><span class="legend-item"><i class="legend-dot" style="background:#89c7a8"></i>Transition</span><span class="legend-item"><i class="legend-dot" style="background:#4da3d9"></i>Flooded</span></div>`;
  }

  function renderEvidence() {
    const field = getField();
    const evidence = getEvidence(field.parcelId);
    return `
      <section class="grid monitoring-layout">
        <aside class="card details-panel">
          <h2>Field Search</h2>
          <p class="subtle mt-6">위경도, 지역, 일련번호로 검색하여 증빙 데이터를 확인합니다.</p>
          ${renderFieldSearch('evidence', '위경도, 지역, 일련번호로 검색')}
          <div class="callout warning mt-18">GitHub Pages에는 실제 파일 업로드/저장 기능이 없습니다. 사진·계약서·민감 좌표는 커밋하지 마세요.</div>
        </aside>
        <div class="grid">
          <article class="card pad">
            <div class="card-header">
              <div>
                <h2>Evidence Data Room</h2>
                <p class="subtle mt-6">${field.region} · ${field.parcelId}</p>
              </div>
              ${statusBadge(field.status)}
            </div>
            <div class="evidence-grid">
              ${evidence.map((row) => {
                const meta = evidenceMeta[row.evidenceType] || { label: row.evidenceType, icon: '•' };
                return `<article class="evidence-card">
                  <div style="font-size:27px;">${meta.icon}</div>
                  <h3>${meta.label}</h3>
                  ${evidenceBadge(row.status)}
                  <p class="subtle"><strong>Source:</strong> ${htmlEscape(row.source)}</p>
                  <p class="tiny">Date: ${htmlEscape(row.date)} · Confidence: ${htmlEscape(row.confidence)}</p>
                </article>`;
              }).join('')}
            </div>
          </article>
          <article class="card pad">
            <h2>Evidence Table</h2>
            <div class="table-wrap"><table><thead><tr><th>Type</th><th>Status</th><th>Source</th><th>Date</th><th>Confidence</th></tr></thead><tbody>
              ${evidence.map((row) => `<tr><td>${htmlEscape(evidenceMeta[row.evidenceType]?.label || row.evidenceType)}</td><td>${evidenceBadge(row.status)}</td><td>${htmlEscape(row.source)}</td><td>${row.date}</td><td>${row.confidence}</td></tr>`).join('')}
            </tbody></table></div>
          </article>
        </div>
      </section>
    `;
  }

  function renderBuyerReport() {
    const lot = dataset.buyerLots.find((item) => item.lotId === state.selectedLotId) || dataset.buyerLots[0];
    const lotFields = dataset.fields.filter((field) => lot.parcelIds.includes(field.parcelId));
    const totalArea = lotFields.reduce((sum, field) => sum + field.areaHa, 0);
    const totalCh4 = lotFields.reduce((sum, field) => sum + field.totalCh4, 0);
    const totalTco2e = lotFields.reduce((sum, field) => sum + field.estimatedReductionTco2e, 0);
    return `
      <section class="grid report-layout">
        <article class="report-paper" id="reportPaper">
          <div class="report-header">
            <div>
              <p class="eyebrow">Buyer Report · Mock-Up</p>
              <h2>바이어 리포트(Mock-Up)</h2>
              <p class="subtle mt-6">Low-Carbon Rice AWD Evidence Report</p>
            </div>
            <img src="assets/images/agri-i-logo.jpg" alt="Agri-I logo" style="width:120px;height:64px;object-fit:cover;border-radius:14px;" />
          </div>
          <section class="grid two">
            ${miniMetric(lot.lotId, 'Lot ID')}
            ${miniMetric(`${formatNumber(lotFields.length)}개`, '참여 부지')}
            ${miniMetric(`${formatNumber(totalArea, 2)}ha`, '관리 면적')}
            ${miniMetric(`${formatNumber(totalTco2e, 2)}t`, 'CO₂e 환산 예시')}
          </section>
          <div class="callout warning mt-18">
            이 리포트는 향후 바이어 제출용 출력물의 <strong>Mock-Up</strong>입니다. 공식 인증서 또는 탄소크레딧 발행 문서가 아닙니다.
          </div>
          <h3 class="mt-18">Field Summary</h3>
          ${renderFieldTable(lotFields, { compact: true })}
          <h3 class="mt-18">Evidence Checklist</h3>
          <div class="evidence-grid">
            ${['SATELLITE_OBSERVATION','WEATHER_SERIES','FARMER_ACTIVITY_LOG','POLYGON_BOUNDARY'].map((type) => {
              const rows = dataset.evidence.filter((row) => lot.parcelIds.includes(row.parcelId) && row.evidenceType === type);
              const collected = rows.filter((row) => row.status !== 'MISSING').length;
              const meta = evidenceMeta[type];
              return `<article class="evidence-card"><h3>${meta.icon} ${meta.label}</h3><strong>${collected}/${rows.length}</strong><p class="subtle">lot 단위 증빙 수집 상태</p></article>`;
            }).join('')}
          </div>
          <p class="tiny mt-18">Source: CH4 prediction CSV (<code>${htmlEscape(dataset.dataSourceLabel)}</code>), climate CSV (<code>data/climate_observations.csv</code>), Sentinel-2 Cloudless satellite view.</p>
        </article>
        <aside class="card details-panel no-print">
          <h2>Report Actions</h2>
          <p class="subtle mt-6">브라우저 인쇄 기능으로 PDF 저장이 가능합니다.</p>
          <div class="button-row mt-14">
            <button class="btn" data-action="print-report">PDF로 저장/인쇄</button>
            <button class="btn secondary" data-action="download-report-json">Report JSON</button>
          </div>
          <div class="detail-list mt-18">
            ${detailRow('Lot name', lot.name)}
            ${detailRow('Volume', `${formatNumber(lot.volumeTon, 1)} ton`)}
            ${detailRow('Total CH₄', `${formatNumber(totalCh4, 2)} CSV units`)}
            ${detailRow('Report status', lot.reportStatus)}
          </div>
        </aside>
      </section>
    `;
  }

  function renderPassport() {
    const field = getField();
    return `
      <article class="card passport-card">
        <div class="passport-hero">
          <p class="eyebrow" style="color:#c8f6d6;">Product Passport · Mock-Up</p>
          <h2>Agri-I 저탄소 AWD 쌀</h2>
          <p>QR 기반 생산 이력·저탄소 스토리 확인 화면 예시입니다.</p>
        </div>
        <div class="passport-body">
          <div class="button-row" style="justify-content:space-between;align-items:flex-start;">
            <div>
              <h3>${field.region}</h3>
              <p class="subtle">${field.parcelId} · ${formatNumber(field.lat, 5)}, ${formatNumber(field.lon, 5)}</p>
            </div>
            <div class="qr-box" aria-label="QR mockup"></div>
          </div>
          <div class="detail-list mt-18">
            ${detailRow('AWD Score', `${field.awdScoreExample} / 100 (for example)`)}
            ${detailRow('면적', `${formatNumber(field.areaHa, 2)} ha`)}
            ${detailRow('CH₄ 추정량', `${formatNumber(field.totalCh4, 2)} CSV units`)}
            ${detailRow('CO₂e 환산 예시', `${formatNumber(field.estimatedReductionTco2e, 2)} tCO₂e`)}
            ${detailRow('증빙 완료율', `${field.evidenceRate}%`)}
          </div>
          <div class="callout warning mt-18">현재 화면은 제품 패스포트(Mock-Up)입니다. 인증 완료 표시가 아니라 향후 제품 단위 신뢰 정보 예시입니다.</div>
        </div>
      </article>
    `;
  }

  function renderMethodology() {
    return `
      <section class="grid two">
        <article class="card pad">
          <h2>AWD Score (for example) 산정 방식</h2>
          <p class="subtle mt-10">업로드 CSV에는 AWD 이행 점수가 직접 들어있지 않기 때문에, 현재 웹앱의 AWD Score는 발표용 상대지표입니다.</p>
          <div class="callout warning mt-14">
            <strong>공식 점수 아님</strong><br />각 위치의 평균 <code>CH4_추정량</code>을 전체 위치 평균 범위 안에서 정규화해 55~90점으로 매핑합니다. 평균 CH₄ 추정량이 낮은 부지는 점수가 높고, 높은 부지는 Watch/Risk로 표시됩니다.
          </div>
          <pre class="callout mt-14" style="white-space:pre-wrap;"><code>score = 55 + 35 × (maxMeanCH4 - fieldMeanCH4) / (maxMeanCH4 - minMeanCH4)
status = score ≥ 75: On Track, 60~74: Watch, &lt;60: Risk</code></pre>
          <p class="subtle mt-10">실제 서비스에서는 Sentinel-1/2, Landsat, ERA5, 기상청 AWS, 현장 물관리 기록을 함께 사용해 AWD 이행 여부를 검증해야 합니다.</p>
        </article>
        <article class="card pad">
          <h2>Satellite & Climate Data</h2>
          <div class="detail-list mt-14">
            ${detailRow('Satellite current mode', DATA.sources.satellite.mode)}
            ${detailRow('Satellite tile', 'EOX Sentinel-2 Cloudless 2024')}
            ${detailRow('Climate CSV', 'data/climate_observations.csv')}
            ${detailRow('Korea climate CSV', 'data/korea_climate_summary.csv')}
            ${detailRow('GEE optional', GEE_CONFIG.enabled ? 'enabled' : 'disabled')}
          </div>
          <div class="callout info mt-18">
            GitHub Pages에서 비용 없이 동작하도록 현재 구현은 API Key가 필요 없는 Sentinel-2 Cloudless tile layer를 사용합니다. GEE 실시간 타일로 전환하려면 Google Cloud Project와 Earth Engine OAuth 설정이 필요합니다.
          </div>
        </article>
      </section>
      <article class="card pad">
        <h2>dMRV 처리 흐름</h2>
        <div class="grid four mt-14">
          ${featureCard('1. CSV 수집', '위도·경도·시간·CH4 추정량 업로드', '1')}
          ${featureCard('2. 중복 처리', '동일 Key 중복을 관리자 선택으로 처리', '2')}
          ${featureCard('3. 필지 집계', '고유 위경도별 부지/감축량/KPI 생성', '3')}
          ${featureCard('4. 증빙 연결', '위성·기후·활동기록·경계 데이터룸 표시', '4')}
        </div>
      </article>
    `;
  }

  function renderGuide() {
    return `
      <section class="grid two">
        <article class="card pad">
          <h2>GitHub Pages 배포</h2>
          <pre class="callout mt-14" style="white-space:pre-wrap;"><code>git init
git add .
git commit -m "Update Agri-I feedback build"
git branch -M main
git remote add origin https://github.com/&lt;YOUR_ACCOUNT&gt;/&lt;YOUR_REPO&gt;.git
git push -u origin main</code></pre>
          <p class="subtle mt-10">Settings → Pages → Source를 GitHub Actions 또는 main/root로 지정하면 됩니다.</p>
        </article>
        <article class="card pad">
          <h2>Data Files</h2>
          <div class="detail-list mt-14">
            ${detailRow('CH4 CSV', 'data/ch4_predictions.csv')}
            ${detailRow('Climate CSV', 'data/climate_observations.csv')}
            ${detailRow('Korea Climate CSV', 'data/korea_climate_summary.csv')}
            ${detailRow('Static data bundle', 'assets/js/data.js')}
            ${detailRow('Logo', 'assets/images/agri-i-logo.jpg / agri-i-logo-square.jpg')}
          </div>
          <div class="callout warning mt-18">실제 농가 개인정보, 연락처, 계약정보, 원본 민감 좌표, API Key, .env 파일은 public repository에 커밋하지 마세요.</div>
        </article>
      </section>
    `;
  }

  function renderFieldSearch(context, placeholder) {
    const q = state.fieldSearch[context] || '';
    const results = filterFields(q).slice(0, 12);
    return `<div class="search-panel mt-14">
      <input type="search" data-field-search="${context}" value="${htmlEscape(q)}" placeholder="${htmlEscape(placeholder)}" />
      <div class="search-results">
        ${results.map((field) => `<div class="search-item ${field.parcelId === state.selectedFieldId ? 'active' : ''}" data-select-field="${field.parcelId}" data-context="${context}">
          <strong>${compactId(field.parcelId)} ${statusBadge(field.status)}</strong>
          <span>${field.region} · ${formatNumber(field.lat, 5)}, ${formatNumber(field.lon, 5)} · serial ${field.serial}</span>
          <span>CH₄ ${formatNumber(field.totalCh4, 1)} · AWD Score ${field.awdScoreExample} <em>(for example)</em></span>
        </div>`).join('')}
      </div>
    </div>`;
  }

  function renderFieldTable(fields, options = {}) {
    const rows = fields.length ? fields : [];
    if (!rows.length) return '<p class="subtle">표시할 부지가 없습니다.</p>';
    const compact = Boolean(options.compact);
    return `<div class="table-wrap"><table><thead><tr>
      <th>Field</th><th>Region</th><th>Lat/Lon</th><th>Area</th><th>AWD Score</th><th>CH₄</th><th>CO₂e</th><th>Status</th>${compact ? '' : '<th>Rows</th>'}
    </tr></thead><tbody>
      ${rows.map((field) => `<tr class="clickable" data-select-field="${field.parcelId}" data-context="table">
        <td><strong>${htmlEscape(field.parcelId)}</strong><br><span class="tiny">serial ${field.serial}</span></td>
        <td>${htmlEscape(field.region)}</td>
        <td>${formatNumber(field.lat, 5)}, ${formatNumber(field.lon, 5)}</td>
        <td>${formatNumber(field.areaHa, 2)}ha</td>
        <td><strong>${field.awdScoreExample}</strong> <span class="tag">for example</span></td>
        <td>${formatNumber(field.totalCh4, 1)}</td>
        <td>${formatNumber(field.estimatedReductionTco2e, 2)}t</td>
        <td>${statusBadge(field.status)}</td>
        ${compact ? '' : `<td>${formatNumber(field.observationCount)}</td>`}
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  function renderSatelliteTileMap({ centerLat, centerLon, zoom, markers = [], mode = 'home', footprint = false }) {
    const center = lonLatToPixels(centerLon, centerLat, zoom);
    const tileX = Math.floor(center.x / 256);
    const tileY = Math.floor(center.y / 256);
    const tileRadiusX = mode === 'home' ? 3 : 2;
    const tileRadiusY = mode === 'home' ? 2 : 2;
    const n = 2 ** zoom;
    let tiles = '';
    for (let x = tileX - tileRadiusX; x <= tileX + tileRadiusX; x += 1) {
      for (let y = tileY - tileRadiusY; y <= tileY + tileRadiusY; y += 1) {
        if (y < 0 || y >= n) continue;
        const wrappedX = ((x % n) + n) % n;
        const left = x * 256 - center.x;
        const top = y * 256 - center.y;
        const src = DATA.sources.satellite.tileTemplate.replace('{z}', zoom).replace('{x}', wrappedX).replace('{y}', y);
        tiles += `<img class="tile-img" alt="" src="${src}" loading="lazy" style="left:calc(50% + ${left.toFixed(2)}px);top:calc(50% + ${top.toFixed(2)}px);" />`;
      }
    }
    const markerHtml = markers.map((field) => {
      const point = lonLatToPixels(field.lon, field.lat, zoom);
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const meta = statusMeta[field.status] || statusMeta.MISSING;
      return `<button class="map-marker ${meta.marker}" data-select-field="${field.parcelId}" data-context="map" data-label="${compactId(field.parcelId)} · ${htmlEscape(field.region)}" style="left:calc(50% + ${dx.toFixed(2)}px);top:calc(50% + ${dy.toFixed(2)}px);" aria-label="${field.parcelId}"></button>`;
    }).join('');
    let footprintHtml = '';
    if (footprint) {
      const mpp = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / (2 ** zoom);
      const widthPx = clamp(100 / mpp, 24, 320);
      const heightPx = clamp(50 / mpp, 14, 220);
      footprintHtml = `<div class="search-footprint" style="width:${widthPx.toFixed(1)}px;height:${heightPx.toFixed(1)}px;"></div><div class="search-crosshair"></div><div class="map-scale">100m × 50m</div>`;
    }
    return `<div class="tile-map">
      ${tiles}
      <div class="tile-overlay"></div>
      ${markerHtml}
      ${footprintHtml}
      <div class="map-attribution">${mode === 'home' ? 'Korean Peninsula · ' : ''}Sentinel-2 Cloudless 2024</div>
    </div>`;
  }

  function lonLatToPixels(lon, lat, zoom) {
    const sinLat = Math.sin(lat * Math.PI / 180);
    const mapSize = 256 * (2 ** zoom);
    const x = ((lon + 180) / 360) * mapSize;
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * mapSize;
    return { x, y };
  }

  function lineChart(rows, xKey, yKey, options = {}) {
    const data = rows.filter((row) => Number.isFinite(Number(row[yKey])));
    if (!data.length) return '<p class="subtle">차트 데이터가 없습니다.</p>';
    const width = 640;
    const height = 235;
    const pad = { left: 42, right: 18, top: 18, bottom: 36 };
    const values = data.map((row) => Number(row[yKey]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const yMin = min === max ? min - 1 : min;
    const yMax = min === max ? max + 1 : max;
    const points = data.map((row, index) => {
      const x = pad.left + (index / Math.max(data.length - 1, 1)) * (width - pad.left - pad.right);
      const y = pad.top + (1 - ((Number(row[yKey]) - yMin) / (yMax - yMin))) * (height - pad.top - pad.bottom);
      return { x, y, label: row[xKey], value: Number(row[yKey]) };
    });
    const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const area = `${pad.left},${height - pad.bottom} ${line} ${width - pad.right},${height - pad.bottom}`;
    const color = options.color || '#0f8f59';
    const ticks = [0, 0.5, 1].map((t) => {
      const y = pad.top + t * (height - pad.top - pad.bottom);
      const val = yMax - t * (yMax - yMin);
      return `<line class="chart-grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"/><text class="chart-label" x="6" y="${y + 4}">${formatNumber(val, 1)}</text>`;
    }).join('');
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img">
      ${ticks}
      <line class="chart-axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" />
      ${options.area ? `<polygon class="chart-area" points="${area}" fill="${color}"></polygon>` : ''}
      <polyline class="chart-line" points="${line}" stroke="${color}"></polyline>
      ${points.filter((_, i) => i % Math.ceil(points.length / 12) === 0 || i === points.length - 1).map((point) => `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="4" fill="${color}"><title>${point.label}: ${formatNumber(point.value, 3)} ${options.unit || ''}</title></circle>`).join('')}
      <text class="chart-label" x="${pad.left}" y="${height - 9}">${htmlEscape(data[0][xKey])}</text>
      <text class="chart-label" x="${width - pad.right - 84}" y="${height - 9}">${htmlEscape(data[data.length - 1][xKey])}</text>
      <text class="chart-label" x="${width - pad.right - 90}" y="18">${htmlEscape(options.unit || '')}</text>
    </svg>`;
  }

  function dualLineChart(rows, xKey, yKeyA, yKeyB, options = {}) {
    const data = rows.filter((row) => Number.isFinite(Number(row[yKeyA])) && Number.isFinite(Number(row[yKeyB])));
    if (!data.length) return '<p class="subtle">차트 데이터가 없습니다.</p>';
    const width = 640;
    const height = 235;
    const pad = { left: 42, right: 18, top: 24, bottom: 36 };
    const values = data.flatMap((row) => [Number(row[yKeyA]), Number(row[yKeyB])]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const yMin = min === max ? min - 1 : min;
    const yMax = min === max ? max + 1 : max;
    function pointsFor(key) {
      return data.map((row, index) => {
        const x = pad.left + (index / Math.max(data.length - 1, 1)) * (width - pad.left - pad.right);
        const y = pad.top + (1 - ((Number(row[key]) - yMin) / (yMax - yMin))) * (height - pad.top - pad.bottom);
        return { x, y, label: row[xKey], value: Number(row[key]) };
      });
    }
    const ptsA = pointsFor(yKeyA);
    const ptsB = pointsFor(yKeyB);
    const lineA = ptsA.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const lineB = ptsB.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const colorA = options.colorA || '#0f8f59';
    const colorB = options.colorB || '#e2a229';
    const ticks = [0, 0.5, 1].map((t) => {
      const y = pad.top + t * (height - pad.top - pad.bottom);
      const val = yMax - t * (yMax - yMin);
      return `<line class="chart-grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}"/><text class="chart-label" x="6" y="${y + 4}">${formatNumber(val, 1)}</text>`;
    }).join('');
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img">
      ${ticks}
      <line class="chart-axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" />
      <polyline class="chart-line" points="${lineA}" stroke="${colorA}"></polyline>
      <polyline class="chart-line" points="${lineB}" stroke="${colorB}"></polyline>
      <circle cx="${pad.left}" cy="13" r="5" fill="${colorA}"></circle><text class="chart-label" x="${pad.left + 10}" y="17">${htmlEscape(options.labelA || yKeyA)}</text>
      <circle cx="${pad.left + 128}" cy="13" r="5" fill="${colorB}"></circle><text class="chart-label" x="${pad.left + 138}" y="17">${htmlEscape(options.labelB || yKeyB)}</text>
      <text class="chart-label" x="${pad.left}" y="${height - 9}">${htmlEscape(data[0][xKey])}</text>
      <text class="chart-label" x="${width - pad.right - 84}" y="${height - 9}">${htmlEscape(data[data.length - 1][xKey])}</text>
      <text class="chart-label" x="${width - pad.right - 90}" y="18">${htmlEscape(options.unit || '')}</text>
    </svg>`;
  }

  function parseCsv(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) throw new Error('CSV 행이 부족합니다.');
    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    const rows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
    return normalizeCsvRows(rows);
  }

  function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; continue; }
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += char;
    }
    result.push(current);
    return result;
  }

  function normalizeCsvRows(rows) {
    const aliases = {
      lat: ['위도', 'lat', 'latitude', 'Latitude'],
      lon: ['경도', 'lon', 'lng', 'longitude', 'Longitude'],
      startTime: ['시작시간', 'startTime', 'start_time', 'start', 'Start'],
      endTime: ['종료시간', 'endTime', 'end_time', 'end', 'End'],
      ch4Estimated: ['CH4_추정량', 'ch4Estimated', 'CH4', 'ch4', 'prediction']
    };
    function pick(row, key) {
      const name = aliases[key].find((candidate) => Object.prototype.hasOwnProperty.call(row, candidate));
      return name ? row[name] : '';
    }
    const normalized = rows.map((row) => ({
      lat: Number(pick(row, 'lat')),
      lon: Number(pick(row, 'lon')),
      startTime: String(pick(row, 'startTime')).trim(),
      endTime: String(pick(row, 'endTime')).trim(),
      ch4Estimated: Number(pick(row, 'ch4Estimated'))
    })).filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.startTime && row.endTime && Number.isFinite(row.ch4Estimated));
    if (!normalized.length) throw new Error('필수 컬럼을 찾지 못했습니다. 위도, 경도, 시작시간, 종료시간, CH4_추정량이 필요합니다.');
    return normalized;
  }

  function findDuplicateKeys(rows) {
    const groups = new Map();
    rows.forEach((row, index) => {
      const key = `${row.lat.toFixed(6)}|${row.lon.toFixed(6)}|${row.startTime}|${row.endTime}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ row, index });
    });
    return Array.from(groups.entries()).filter(([, items]) => items.length > 1).map(([key, items]) => ({ key, count: items.length, items }));
  }

  function resolveDuplicateRows(rows, mode) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = `${row.lat.toFixed(6)}|${row.lon.toFixed(6)}|${row.startTime}|${row.endTime}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    const resolved = [];
    groups.forEach((items) => {
      if (items.length === 1) { resolved.push(items[0]); return; }
      if (mode === 'last') { resolved.push(items[items.length - 1]); return; }
      if (mode === 'average') {
        const base = items[0];
        const avg = items.reduce((sum, row) => sum + row.ch4Estimated, 0) / items.length;
        resolved.push({ ...base, ch4Estimated: avg });
        return;
      }
      resolved.push(items[0]);
    });
    return resolved;
  }

  function showDuplicateModal(rows, duplicates) {
    const duplicateRows = duplicates.reduce((sum, group) => sum + group.count - 1, 0);
    modalRoot.classList.add('show');
    modalRoot.innerHTML = `<div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card">
        <h2>중복 Key가 발견되었습니다</h2>
        <p class="subtle mt-6">동일한 <code>위도|경도|시작시간|종료시간</code> 조합이 ${formatNumber(duplicates.length)}개 그룹, 중복 행 ${formatNumber(duplicateRows)}개 발견되었습니다. 처리 방식을 선택하세요.</p>
        <div class="duplicate-list mt-14">
          ${duplicates.slice(0, 18).map((group) => `<div><code>${htmlEscape(group.key)}</code> · ${group.count} rows</div>`).join('')}
          ${duplicates.length > 18 ? `<div>... 외 ${duplicates.length - 18}개 그룹</div>` : ''}
        </div>
        <div class="button-row mt-18">
          <button class="btn" data-duplicate-mode="first">첫 행 유지</button>
          <button class="btn secondary" data-duplicate-mode="last">마지막 행 유지</button>
          <button class="btn secondary" data-duplicate-mode="average">CH₄ 평균값 사용</button>
          <button class="btn danger" data-duplicate-mode="cancel">업로드 취소</button>
        </div>
      </div>
    </div>`;
    modalRoot._pendingRows = rows;
  }

  function closeModal() {
    modalRoot.classList.remove('show');
    modalRoot.innerHTML = '';
    modalRoot._pendingRows = null;
  }

  function applyUploadedRows(rows, sourceLabel) {
    dataset = buildDatasetFromRows(rows, sourceLabel);
    localStorage.setItem(storageKeys.uploadedRows, JSON.stringify(rows));
    state.selectedFieldId = dataset.fields[0]?.parcelId || '';
    state.dashboardMode = 'home';
    localStorage.setItem(storageKeys.selectedField, state.selectedFieldId);
    localStorage.setItem(storageKeys.dashboardMode, state.dashboardMode);
    toast(`${dataset.fields.length}개 위치, ${dataset.predictions.length}개 예측 행을 반영했습니다.`);
    render();
  }

  function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result || ''));
        const duplicates = findDuplicateKeys(rows);
        if (duplicates.length) {
          showDuplicateModal(rows, duplicates);
          return;
        }
        applyUploadedRows(rows, `Uploaded CSV: ${file.name}`);
      } catch (error) {
        toast(error.message || 'CSV 처리 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function downloadBlob(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadNormalizedCsv() {
    const header = ['위도', '경도', '시작시간', '종료시간', 'CH4_추정량'];
    const lines = [header.join(',')].concat(dataset.predictions.map((row) => [row.lat, row.lon, row.startTime, row.endTime, row.ch4Estimated].map(csvCell).join(',')));
    downloadBlob('agri-i-normalized-ch4_predictions.csv', lines.join('\n'), 'text/csv;charset=utf-8');
  }

  function downloadClimateCsv() {
    const header = ['parcelId', 'lat', 'lon', 'startTime', 'endTime', 'temperatureC', 'rainfallMm', 'normalTemperatureC', 'previousYearTemperatureC', 'normalRainfallMm', 'previousYearRainfallMm', 'source', 'dataPath'];
    const lines = [header.join(',')].concat(dataset.climate.map((row) => header.map((key) => csvCell(row[key])).join(',')));
    downloadBlob('climate_observations.csv', lines.join('\n'), 'text/csv;charset=utf-8');
  }

  function exportFieldData(parcelId) {
    const payload = { field: getField(parcelId), predictions: getPredictions(parcelId), climate: getClimate(parcelId), evidence: getEvidence(parcelId) };
    downloadBlob(`${parcelId}-dmrv-data.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function downloadReportJson() {
    const lot = dataset.buyerLots.find((item) => item.lotId === state.selectedLotId) || dataset.buyerLots[0];
    const payload = { lot, fields: dataset.fields.filter((field) => lot.parcelIds.includes(field.parcelId)), evidence: dataset.evidence.filter((row) => lot.parcelIds.includes(row.parcelId)) };
    downloadBlob(`${lot.lotId}-buyer-report-mockup.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function setupStaticEvents() {
    window.addEventListener('hashchange', render);
    document.querySelector('.brand').addEventListener('click', () => { location.hash = '#/'; });
    resetDemoBtn.addEventListener('click', () => {
      localStorage.removeItem(storageKeys.uploadedRows);
      localStorage.removeItem(storageKeys.selectedField);
      localStorage.removeItem(storageKeys.dashboardMode);
      dataset = buildDatasetFromStaticData();
      state.selectedFieldId = dataset.fields[0].parcelId;
      state.dashboardMode = 'home';
      toast('업로드 데이터를 초기화하고 기본 ch4_predictions.csv로 복원했습니다.');
      render();
    });

    app.addEventListener('click', (event) => {
      const selectField = event.target.closest('[data-select-field]');
      if (selectField) {
        const fieldId = selectField.getAttribute('data-select-field');
        const context = selectField.getAttribute('data-context');
        setSelectedField(fieldId, context === 'dashboard' || context === 'map' || context === 'table' ? 'result' : undefined);
        return;
      }
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.getAttribute('data-action');
        if (action === 'dashboard-home') { state.dashboardMode = 'home'; localStorage.setItem(storageKeys.dashboardMode, 'home'); render(); }
        if (action === 'download-normalized-csv') downloadNormalizedCsv();
        if (action === 'download-climate-csv') downloadClimateCsv();
        if (action === 'clear-uploaded-csv') { localStorage.removeItem(storageKeys.uploadedRows); dataset = buildDatasetFromStaticData(); state.selectedFieldId = dataset.fields[0].parcelId; toast('업로드 CSV를 초기화했습니다.'); render(); }
        if (action === 'print-report') window.print();
        if (action === 'download-report-json') downloadReportJson();
        return;
      }
      const routeEl = event.target.closest('[data-route-to]');
      if (routeEl) {
        location.hash = `#/${routeEl.getAttribute('data-route-to')}`;
        return;
      }
      const downloadField = event.target.closest('[data-download-field]');
      if (downloadField) {
        exportFieldData(downloadField.getAttribute('data-download-field'));
      }
    });

    app.addEventListener('input', (event) => {
      const fieldSearch = event.target.getAttribute('data-field-search');
      if (fieldSearch) {
        state.fieldSearch[fieldSearch] = event.target.value;
        render();
      }
      if (event.target.getAttribute('data-input') === 'data-search') {
        state.dataSearch = event.target.value;
        render();
      }
    });

    app.addEventListener('change', (event) => {
      if (event.target.id === 'ch4CsvInput') handleCsvUpload(event);
    });

    modalRoot.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-duplicate-mode]');
      if (!btn) return;
      const mode = btn.getAttribute('data-duplicate-mode');
      const rows = modalRoot._pendingRows || [];
      if (mode === 'cancel') { closeModal(); toast('CSV 업로드를 취소했습니다.'); return; }
      const resolved = resolveDuplicateRows(rows, mode);
      closeModal();
      applyUploadedRows(resolved, `Uploaded CSV (${mode} duplicate resolution)`);
    });
  }

  setupStaticEvents();
  render();
})();
