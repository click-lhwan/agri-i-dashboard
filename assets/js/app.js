(function () {
  'use strict';

  const DATA = window.AGRII_DATA;
  const app = document.getElementById('app');
  const pageTitle = document.getElementById('pageTitle');
  const scenarioSelect = document.getElementById('scenarioSelect');
  const resetDemoBtn = document.getElementById('resetDemoBtn');
  const toastEl = document.getElementById('toast');

  const statusMeta = {
    AWD_GOOD: { label: 'On Track', short: 'Good', className: 'status-good', color: '#0f8f59' },
    WATCH: { label: 'Watch', short: 'Watch', className: 'status-watch', color: '#e2a229' },
    RISK: { label: 'Risk', short: 'Risk', className: 'status-risk', color: '#d94a4a' },
    MISSING: { label: 'Missing', short: 'Missing', className: 'status-missing', color: '#8b9891' }
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
    parcels: 'Parcels',
    monitoring: 'Monitoring',
    evidence: 'Evidence Data Room',
    'buyer-report': '바이어 리포트(Mock-Up)',
    passport: 'Product Passport(Mock-Up)',
    methodology: 'Methodology',
    readme: 'Guide'
  };

  const storageKeys = {
    selectedParcel: 'agrii:selectedParcel',
    scenario: 'agrii:scenario',
    overrides: 'agrii:parcelOverrides'
  };

  const state = {
    route: 'dashboard',
    selectedParcelId: localStorage.getItem(storageKeys.selectedParcel) || DATA.parcelsGeoJSON.features[0].properties.parcelId,
    selectedScenario: localStorage.getItem(storageKeys.scenario) || 'pilot30',
    filters: { region: 'ALL', status: 'ALL', buyer: 'ALL', query: '' },
    selectedLotId: DATA.buyerLots[0].lotId,
    parcelOverrides: loadJson(storageKeys.overrides, {})
  };

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveOverrides() {
    localStorage.setItem(storageKeys.overrides, JSON.stringify(state.parcelOverrides));
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

  function compactId(id) {
    return String(id).replace('KR-RICE-', 'R-');
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

  function getScenario() {
    return DATA.scenarios.find((s) => s.id === state.selectedScenario) || DATA.scenarios[0];
  }

  function getParcelFeatures() {
    return DATA.parcelsGeoJSON.features.map((feature) => {
      const id = feature.properties.parcelId;
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...(state.parcelOverrides[id] || {})
        }
      };
    });
  }

  function getParcels() {
    return getParcelFeatures().map((feature) => feature.properties);
  }

  function getParcel(id = state.selectedParcelId) {
    return getParcels().find((parcel) => parcel.parcelId === id) || getParcels()[0];
  }

  function getSelectedFeature() {
    return getParcelFeatures().find((feature) => feature.properties.parcelId === state.selectedParcelId) || getParcelFeatures()[0];
  }

  function getObservations(parcelId = state.selectedParcelId) {
    return DATA.observations.filter((row) => row.parcelId === parcelId);
  }

  function getEvidence(parcelId = state.selectedParcelId) {
    return DATA.evidence.filter((row) => row.parcelId === parcelId);
  }

  function getFilteredParcels() {
    const q = state.filters.query.trim().toLowerCase();
    return getParcels().filter((parcel) => {
      const regionOk = state.filters.region === 'ALL' || parcel.region === state.filters.region;
      const statusOk = state.filters.status === 'ALL' || parcel.status === state.filters.status;
      const buyerOk = state.filters.buyer === 'ALL' || String(parcel.buyerCandidate) === state.filters.buyer;
      const text = `${parcel.parcelId} ${parcel.farmerCode} ${parcel.region} ${parcel.farmName}`.toLowerCase();
      const queryOk = !q || text.includes(q);
      return regionOk && statusOk && buyerOk && queryOk;
    });
  }

  function getRegions() {
    return Array.from(new Set(getParcels().map((p) => p.region))).sort();
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastEl._timer);
    toastEl._timer = window.setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function setSelectedParcel(parcelId, reroute) {
    if (!getParcels().some((p) => p.parcelId === parcelId)) return;
    state.selectedParcelId = parcelId;
    localStorage.setItem(storageKeys.selectedParcel, parcelId);
    if (reroute) location.hash = reroute;
    render();
  }

  function routeFromHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    return raw || 'dashboard';
  }

  function setupScenarioSelect() {
    scenarioSelect.innerHTML = DATA.scenarios.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    scenarioSelect.value = state.selectedScenario;
    scenarioSelect.addEventListener('change', (event) => {
      state.selectedScenario = event.target.value;
      localStorage.setItem(storageKeys.scenario, state.selectedScenario);
      toast(`${getScenario().name} 시나리오로 전환했습니다.`);
      render();
    });
  }

  function setupStaticEvents() {
    window.addEventListener('hashchange', render);
    document.querySelector('.brand').addEventListener('click', () => { location.hash = '#/'; });
    resetDemoBtn.addEventListener('click', () => {
      localStorage.removeItem(storageKeys.overrides);
      localStorage.removeItem(storageKeys.selectedParcel);
      state.parcelOverrides = {};
      state.selectedParcelId = DATA.parcelsGeoJSON.features[0].properties.parcelId;
      toast('데모 데이터가 초기화되었습니다.');
      render();
    });
  }

  function updateNav() {
    document.querySelectorAll('[data-route]').forEach((el) => {
      const key = el.getAttribute('data-route');
      el.classList.toggle('active', key === state.route);
    });
  }

  function render() {
    state.route = routeFromHash();
    pageTitle.textContent = titleMap[state.route] || titleMap.dashboard;
    updateNav();

    const renderers = {
      '': renderLanding,
      dashboard: renderDashboard,
      parcels: renderParcels,
      monitoring: renderMonitoring,
      evidence: renderEvidence,
      'buyer-report': renderBuyerReport,
      passport: renderPassport,
      methodology: renderMethodology,
      readme: renderGuide
    };

    const renderer = renderers[state.route] || renderDashboard;
    app.innerHTML = renderer();
    bindPageEvents();
  }

  function renderLanding() {
    const scenario = getScenario();
    return `
      <section class="card hero">
        <div class="hero-copy">
          <p class="eyebrow">Agri-I Prototype</p>
          <h2>AWD 기반<br />저탄소 쌀 dMRV<br />운영 대시보드</h2>
          <p>
            소농의 AWD 물관리 이행 데이터를 필지 단위로 정리하고, 위성·기상 기반 관측치와 증빙 상태를 연결해 바이어 제출용 자료의 기초를 만드는 정적 웹 프로토타입입니다.
          </p>
          <div class="button-row">
            <a class="btn" href="#/dashboard">대시보드 보기</a>
            <a class="btn secondary" href="#/buyer-report">바이어 리포트(Mock-Up)</a>
            <a class="btn secondary" href="#/methodology">방법론 보기</a>
          </div>
          <div class="callout warning mt-18">
            현재 구현 범위는 AWD 기반 필지 모니터링 대시보드입니다. 바이어 리포트(Mock-Up)와 제품 패스포트는 대시보드 이후의 출력물 예시로 분리해 표시합니다.
          </div>
        </div>
        <div class="hero-visual">
          <div class="mock-window">
            <div class="card-header">
              <div>
                <h3>30ha Pilot Overview</h3>
                <p class="subtle mt-6">GitHub Pages static demo · no API key</p>
              </div>
              ${statusBadge('AWD_GOOD')}
            </div>
            <div class="satellite-frame" style="min-height: 250px;">${renderMapSvg(getParcelFeatures().slice(0, 12), false)}</div>
            <div class="hero-kpis">
              <div><strong>${formatNumber(scenario.areaHa, 1)}ha</strong><span>관리 면적</span></div>
              <div><strong>${formatNumber(scenario.awdRate)}%</strong><span>AWD 이행률</span></div>
              <div><strong>${formatNumber(scenario.estimatedReductionTco2e, 1)}</strong><span>tCO₂e 감축 추정</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid three">
        ${featureCard('지도 기반 필지 관리', '익명화된 GeoJSON 필지와 상태 색상을 한 화면에 표시합니다.', '▱')}
        ${featureCard('AWD 모니터링', '침수·건조 시계열, NDWI/SDWI, 강수량을 필지 단위로 확인합니다.', '⌁')}
        ${featureCard('증빙 데이터룸', '위성·기상·활동기록·현장사진·경계 데이터 수집 상태를 추적합니다.', '☷')}
      </section>
    `;
  }

  function featureCard(title, body, icon) {
    return `<article class="card pad"><div class="step-num">${icon}</div><h3>${title}</h3><p class="subtle mt-10">${body}</p></article>`;
  }

  function renderDashboard() {
    const scenario = getScenario();
    const selected = getParcel();
    const observations = getObservations(selected.parcelId);
    const filtered = getFilteredParcels();
    return `
      ${renderKpis(scenario)}
      <section class="grid dashboard">
        <div class="grid">
          <article class="card map-card">
            <div class="card-header">
              <div>
                <h2>Satellite View: Field Monitoring</h2>
                <p class="subtle mt-6">${selected.parcelId} · ${selected.farmName}</p>
              </div>
              <div class="map-toolbar no-print">
                <button class="btn secondary small" data-demo-action="draw">Draw Boundary</button>
                <button class="btn secondary small" data-demo-action="finish">Finish</button>
                <button class="btn secondary small" data-demo-action="reset">Reset</button>
              </div>
            </div>
            <div class="satellite-frame">${renderMapSvg(getParcelFeatures(), true)}</div>
            <p class="map-caption">Initial view is synthetic satellite-like context. Field polygons are fixed to anonymized geographic coordinates and stored in local demo GeoJSON.</p>
            ${renderLegend()}
          </article>
          <section class="grid two">
            <article class="card chart-card">
              <h3>CH₄ Change Trend <span class="subtle">(15-day interval)</span></h3>
              <p class="subtle mt-6">RF model output proxy · selected parcel</p>
              <div class="chart-box">${lineChart(observations, 'date', 'reducedTco2e', { color: '#0f8f59', area: true, yLabel: 'tCO₂e' })}</div>
            </article>
            <article class="card chart-card">
              <h3>Sentinel/Landsat Water Level <span class="subtle">(NDWI)</span></h3>
              <p class="subtle mt-6">Demo water index proxy</p>
              <div class="chart-box">${lineChart(observations, 'date', 'mndwi', { color: '#2f8edb', area: true, yLabel: 'NDWI' })}</div>
            </article>
          </section>
          <article class="card pad">
            <div class="card-header">
              <div>
                <h2>Recent Monitored Fields</h2>
                <p class="subtle mt-6">필지 클릭 시 우측 상세 패널과 모니터링 화면이 함께 갱신됩니다.</p>
              </div>
              <a class="btn secondary small" href="#/parcels">전체 보기</a>
            </div>
            ${renderParcelTable(filtered.slice(0, 8), { compact: true })}
          </article>
        </div>
        ${renderDetailsPanel(selected)}
      </section>
    `;
  }

  function renderKpis(scenario) {
    const selected = getParcel();
    const kpis = [
      ['참여 농가', `${formatNumber(scenario.farmers)}호`, scenario.name],
      ['관리 필지', `${formatNumber(scenario.parcels)}개`, 'GeoJSON 기반'],
      ['관리 면적', `${formatNumber(scenario.areaHa, 1)}ha`, '0단계 실증 목표와 연결'],
      ['AWD 이행률', `${formatNumber(scenario.awdRate)}%`, 'Good/Watch/Risk 가중 평균'],
      ['감축 추정', `${formatNumber(scenario.estimatedReductionTco2e, 1)}t`, 'tCO₂e'],
      ['선택 필지', `${selected.awdScore}점`, selected.parcelId]
    ];
    return `<section class="kpi-grid">${kpis.map(([label, value, foot]) => `
      <article class="kpi-card">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${value}</div>
        <div class="kpi-foot">${foot}</div>
      </article>`).join('')}
    </section>`;
  }

  function renderDetailsPanel(parcel) {
    const feature = getSelectedFeature();
    const coords = feature.geometry.coordinates[0].map((pair) => pair.map((num) => Number(num.toFixed(6))));
    const reductionPct = parcel.baselineTco2e ? Math.round((parcel.estimatedReductionTco2e / parcel.baselineTco2e) * 100) : 0;
    return `
      <aside class="card details-panel">
        <div class="card-header">
          <div><h2>Field Details</h2><p class="subtle mt-6">${parcel.region} · ${parcel.farmerCode}</p></div>
          ${statusBadge(parcel.status)}
        </div>
        <div class="detail-list">
          ${detailRow('Field ID', parcel.parcelId)}
          ${detailRow('Farm Name', parcel.farmName)}
          ${detailRow('Area', `${formatNumber(parcel.areaHa, 2)} ha`)}
          ${detailRow('AWD Score', `${parcel.awdScore} / 100`)}
          ${detailRow('Latitude', `${formatNumber(parcel.lat, 6)}° N`)}
          ${detailRow('Longitude', `${formatNumber(parcel.lon, 6)}° E`)}
          ${detailRow('Latest CH₄', `${parcel.latestCh4CsvUnits} CSV units`)}
          ${detailRow('Estimated CO₂e', `${formatNumber(parcel.estimatedReductionTco2e, 2)} tCO₂e`)}
          ${detailRow('Reduction Rate', `${reductionPct}% of baseline`)}
          ${detailRow('Latest NDWI', parcel.latestNdwi)}
          ${detailRow('Data Source', parcel.dataSource)}
          ${detailRow('Last Update', parcel.lastUpdate)}
        </div>
        <div class="button-row mt-18 no-print">
          <button class="btn" data-load-monitoring="${parcel.parcelId}">Load Monitoring</button>
          <button class="btn secondary" data-copy-boundary="${parcel.parcelId}">Copy Boundary GeoJSON</button>
        </div>
        <label class="field mt-14">
          <span class="label">Paste Field GeoJSON Polygon</span>
          <textarea class="boundary" id="boundaryText" readonly>{"type":"Feature","geometry":{"type":"Polygon","coordinates":[${JSON.stringify(coords)}]}}</textarea>
        </label>
        <p class="subtle mt-10">* AI는 공식 인증을 대체하지 않고, MRV 자료 생성과 검증 비용 절감을 지원하는 보조 도구입니다.</p>
      </aside>
    `;
  }

  function detailRow(label, value) {
    return `<div class="detail-row"><span>${label}</span><strong>${htmlEscape(value)}</strong></div>`;
  }

  function renderLegend() {
    return `<div class="legend">
      ${Object.entries(statusMeta).map(([status, meta]) => `<span class="legend-item"><i class="legend-dot" style="background:${meta.color}"></i>${meta.label}</span>`).join('')}
    </div>`;
  }

  function renderMapSvg(features, clickable) {
    const coords = DATA.parcelsGeoJSON.features.flatMap((f) => f.geometry.coordinates[0]);
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const bbox = {
      minLon: Math.min(...lons), maxLon: Math.max(...lons),
      minLat: Math.min(...lats), maxLat: Math.max(...lats)
    };
    const pad = 7;
    function project(pair) {
      const [lon, lat] = pair;
      const x = pad + ((lon - bbox.minLon) / (bbox.maxLon - bbox.minLon || 1)) * (100 - pad * 2);
      const y = pad + ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat || 1)) * (100 - pad * 2);
      return [x, y];
    }
    const polygons = features.map((feature) => {
      const p = feature.properties;
      const points = feature.geometry.coordinates[0].map(project).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      const centroid = feature.geometry.coordinates[0].slice(0, -1).reduce((acc, pair) => {
        const [x, y] = project(pair);
        acc.x += x; acc.y += y;
        return acc;
      }, { x: 0, y: 0 });
      centroid.x /= 4; centroid.y /= 4;
      const meta = statusMeta[p.status] || statusMeta.MISSING;
      const selectedClass = p.parcelId === state.selectedParcelId ? 'selected' : '';
      return `
        <polygon class="map-poly ${selectedClass}" data-parcel-id="${p.parcelId}" points="${points}" fill="${meta.color}" opacity="0.76"></polygon>
        <text class="map-label" x="${centroid.x.toFixed(2)}" y="${centroid.y.toFixed(2)}" text-anchor="middle">${compactId(p.parcelId)}</text>
      `;
    }).join('');
    return `<svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="필지 지도">${polygons}</svg>`;
  }

  function renderParcels() {
    const filtered = getFilteredParcels();
    const regions = getRegions();
    const selected = getParcel();
    return `
      <section class="card pad">
        <div class="card-header">
          <div>
            <h2>필지 관리</h2>
            <p class="subtle mt-6">서버 없이 localStorage와 CSV/JSON 다운로드로만 동작합니다. 실제 농가명·전화번호·계약정보는 넣지 마세요.</p>
          </div>
          <div class="button-row no-print">
            <button class="btn secondary" data-export="csv">CSV 내보내기</button>
            <button class="btn secondary" data-export="geojson">GeoJSON 내보내기</button>
          </div>
        </div>
        <div class="filter-grid">
          <label class="field"><span class="label">지역</span><select id="filterRegion"><option value="ALL">전체</option>${regions.map((r) => `<option value="${r}" ${state.filters.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
          <label class="field"><span class="label">AWD 상태</span><select id="filterStatus"><option value="ALL">전체</option>${Object.entries(statusMeta).map(([s, meta]) => `<option value="${s}" ${state.filters.status === s ? 'selected' : ''}>${meta.label}</option>`).join('')}</select></label>
          <label class="field"><span class="label">바이어 후보</span><select id="filterBuyer"><option value="ALL">전체</option><option value="true" ${state.filters.buyer === 'true' ? 'selected' : ''}>후보 포함</option><option value="false" ${state.filters.buyer === 'false' ? 'selected' : ''}>후보 제외</option></select></label>
          <label class="field"><span class="label">검색</span><input id="filterQuery" placeholder="필지/농가/지역 검색" value="${htmlEscape(state.filters.query)}" /></label>
        </div>
        <div class="table-actions no-print">
          <label class="import-box field" style="flex:1; min-width: 280px;">
            <span class="label">CSV 가져오기: parcelId,status,awdScore,evidenceRate,buyerCandidate 열을 지원합니다.</span>
            <input type="file" id="csvImport" accept=".csv,text/csv" />
          </label>
          <button class="btn danger" data-clear-overrides="true">브라우저 수정값 초기화</button>
        </div>
        <p class="subtle">현재 표시: ${formatNumber(filtered.length)}개 / 전체 ${formatNumber(getParcels().length)}개</p>
        ${renderParcelTable(filtered, { compact: false })}
      </section>

      <section class="grid dashboard">
        <article class="card map-card">
          <div class="card-header"><div><h2>선택 필지 위치</h2><p class="subtle mt-6">${selected.parcelId} · ${selected.farmName}</p></div>${statusBadge(selected.status)}</div>
          <div class="satellite-frame">${renderMapSvg(getParcelFeatures(), true)}</div>
          ${renderLegend()}
        </article>
        ${renderDetailsPanel(selected)}
      </section>
    `;
  }

  function renderParcelTable(parcels, options = {}) {
    if (!parcels.length) return `<div class="callout warning">조건에 맞는 필지가 없습니다.</div>`;
    const rows = parcels.map((p) => `
      <tr>
        <td><strong>${p.parcelId}</strong><br /><span class="subtle">${p.farmerCode}</span></td>
        <td>${p.region}</td>
        <td>${formatNumber(p.areaHa, 2)} ha</td>
        <td>${statusBadge(p.status)}</td>
        <td><strong>${p.awdScore}</strong><div class="progress ${p.awdScore < 56 ? 'red' : p.awdScore < 78 ? 'orange' : ''}"><span style="width:${p.awdScore}%"></span></div></td>
        <td>${formatNumber(p.estimatedReductionTco2e, 2)} t</td>
        <td>${formatNumber(p.evidenceRate)}%</td>
        ${options.compact ? '' : `<td>${p.buyerCandidate ? '대상' : '미대상'}</td>`}
        <td><button class="btn secondary small" data-select-parcel="${p.parcelId}">선택</button></td>
      </tr>`).join('');
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Field</th><th>Region</th><th>Area</th><th>Status</th><th>AWD Score</th><th>Reduction</th><th>Evidence</th>${options.compact ? '' : '<th>Buyer</th>'}<th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderMonitoring() {
    const selected = getParcel();
    const observations = getObservations(selected.parcelId);
    const latest = observations[observations.length - 1] || {};
    return `
      <section class="grid monitoring-layout">
        <aside class="card pad">
          <h2>Monitoring Control</h2>
          <p class="subtle mt-6">필지를 선택하면 수분지수와 침수·건조 타임라인이 갱신됩니다.</p>
          <label class="field mt-18"><span class="label">Field</span><select id="monitorParcelSelect">${getParcels().map((p) => `<option value="${p.parcelId}" ${p.parcelId === selected.parcelId ? 'selected' : ''}>${p.parcelId} · ${p.region}</option>`).join('')}</select></label>
          <div class="detail-list mt-14">
            ${detailRow('Farm', selected.farmName)}
            ${detailRow('Area', `${formatNumber(selected.areaHa, 2)} ha`)}
            ${detailRow('AWD Status', statusMeta[selected.status].label)}
            ${detailRow('Latest Score', `${latest.awdScore ?? selected.awdScore} / 100`)}
            ${detailRow('Model Confidence', `${formatNumber((latest.modelConfidence || 0) * 100)}%`)}
          </div>
          <div class="callout mt-18">현재 모델: AWD 메탄 감축 RF 모델 R² = 0.85. 공식 인증 대체가 아니라 MRV 자료 생성과 검증 비용 절감을 지원하는 보조 지표입니다.</div>
          <div class="button-row mt-18 no-print"><button class="btn" data-copy-summary="${selected.parcelId}">요약 복사</button><button class="btn secondary" data-export-field="${selected.parcelId}">필지 데이터 다운로드</button></div>
        </aside>

        <div class="grid">
          <section class="grid three">
            ${metricCard('AWD 점수', `${selected.awdScore}점`, 'Good/Watch/Risk 상태 기준')}
            ${metricCard('예상 감축량', `${formatNumber(selected.estimatedReductionTco2e, 2)} tCO₂e`, 'baseline 대비 추정')}
            ${metricCard('증빙 완료율', `${selected.evidenceRate}%`, '위성·기상·활동기록 포함')}
          </section>
          <section class="grid two">
            <article class="card chart-card"><h3>NDWI / MNDWI Water Index</h3><p class="subtle mt-6">침수·건조 상태 판단용 샘플 시계열</p><div class="chart-box">${lineChart(observations, 'date', 'mndwi', { color: '#2f8edb', area: true, yLabel: 'NDWI' })}</div></article>
            <article class="card chart-card"><h3>Estimated Reduction Accumulation</h3><p class="subtle mt-6">필지 단위 감축량 누적 추정</p><div class="chart-box">${lineChart(observations, 'date', 'reducedTco2e', { color: '#0f8f59', area: true, yLabel: 'tCO₂e' })}</div></article>
          </section>
          <section class="grid two">
            <article class="card chart-card"><h3>Rainfall</h3><p class="subtle mt-6">기상청 AWS/ERA5 proxy</p><div class="chart-box">${barChart(observations, 'date', 'rainfallMm', { color: '#2f8edb', yLabel: 'mm' })}</div></article>
            <article class="card chart-card"><h3>Temperature</h3><p class="subtle mt-6">작기별 평균기온 proxy</p><div class="chart-box">${lineChart(observations, 'date', 'temperatureC', { color: '#e2a229', area: false, yLabel: '℃' })}</div></article>
          </section>
          <article class="card pad">
            <div class="card-header"><div><h2>침수·건조 타임라인</h2><p class="subtle mt-6">AWD 실행 여부를 날짜별 상태로 요약합니다.</p></div>${statusBadge(selected.status)}</div>
            ${renderTimeline(observations)}
          </article>
        </div>
      </section>
    `;
  }

  function metricCard(label, value, foot) {
    return `<article class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></article>`;
  }

  function renderTimeline(observations) {
    const segmentClass = { FLOODED: 'segment-flood', DRY: 'segment-dry', MIXED: 'segment-mixed', UNKNOWN: 'segment-unknown' };
    const statusLabel = { FLOODED: '침수', DRY: '건조', MIXED: '혼합', UNKNOWN: '미확인' };
    const rows = observations.map((row) => `
      <div class="timeline-row">
        <strong>${row.date.slice(5)}</strong>
        <div class="timeline-track"><span class="timeline-segment ${segmentClass[row.waterStatus] || 'segment-unknown'}" style="width:100%"></span></div>
        <span class="subtle">${statusLabel[row.waterStatus] || '미확인'}</span>
      </div>`).join('');
    return `<div class="timeline">${rows}</div>`;
  }

  function renderEvidence() {
    const selected = getParcel();
    const evidence = getEvidence(selected.parcelId);
    const summary = Object.entries(evidenceMeta).map(([type, meta]) => {
      const row = evidence.find((item) => item.evidenceType === type);
      return { type, meta, row };
    });
    return `
      <section class="grid dashboard">
        <div class="grid">
          <article class="card pad">
            <div class="card-header">
              <div><h2>증빙 데이터룸</h2><p class="subtle mt-6">필지별 MRV 자료 수집 상태를 보여주는 정적 데이터룸입니다.</p></div>
              <label class="field no-print"><span class="label">Field</span><select id="evidenceParcelSelect">${getParcels().map((p) => `<option value="${p.parcelId}" ${p.parcelId === selected.parcelId ? 'selected' : ''}>${p.parcelId} · ${p.region}</option>`).join('')}</select></label>
            </div>
            <div class="evidence-grid">
              ${summary.map(({ meta, row }) => `
                <article class="evidence-card">
                  <span class="step-num">${meta.icon}</span>
                  ${evidenceBadge(row?.status || 'MISSING')}
                  <strong>${meta.label}</strong>
                  <p>${htmlEscape(row?.source || 'No source')}</p>
                  <p>Confidence: <strong>${row?.confidence || 'LOW'}</strong></p>
                </article>`).join('')}
            </div>
          </article>
          <article class="card pad">
            <h2>Evidence Table</h2>
            <p class="subtle mt-6">실제 저장소에는 샘플 데이터만 업로드해야 합니다.</p>
            <div class="table-wrap mt-14">
              <table>
                <thead><tr><th>Type</th><th>Source</th><th>Date</th><th>Status</th><th>Confidence</th></tr></thead>
                <tbody>${evidence.map((item) => `<tr><td><strong>${evidenceMeta[item.evidenceType]?.label || item.evidenceType}</strong></td><td>${item.source}</td><td>${item.date}</td><td>${evidenceBadge(item.status)}</td><td>${item.confidence}</td></tr>`).join('')}</tbody>
              </table>
            </div>
          </article>
        </div>
        ${renderDetailsPanel(selected)}
      </section>
    `;
  }

  function renderBuyerReport() {
    const lot = DATA.buyerLots.find((item) => item.lotId === state.selectedLotId) || DATA.buyerLots[0];
    const parcels = lot.parcelIds.map((id) => getParcel(id)).filter(Boolean);
    const area = parcels.reduce((sum, p) => sum + p.areaHa, 0);
    const avgAwd = parcels.length ? Math.round(parcels.reduce((sum, p) => sum + p.awdScore, 0) / parcels.length) : 0;
    const evidenceRate = parcels.length ? Math.round(parcels.reduce((sum, p) => sum + p.evidenceRate, 0) / parcels.length) : 0;
    return `
      <section class="grid report-layout">
        <article class="report-paper" id="reportPaper">
          <div class="report-cover">
            <span class="mockup-label">바이어 리포트(Mock-Up)</span>
            <h2 class="mt-14">Low-Carbon Rice AWD Evidence Report</h2>
            <p>${lot.title} · ${lot.lotId}</p>
          </div>
          <div class="report-body">
            <div class="card-header">
              <div>
                <h2>납품 Lot 요약</h2>
                <p class="subtle mt-6">생산지, 필지 코드, AWD 이행 기간, 감축 추정량을 바이어 제출 형식으로 요약합니다.</p>
              </div>
              ${statusBadge('AWD_GOOD')}
            </div>
            <div class="report-kpis">
              <div><span>Region</span><strong>${lot.region}</strong></div>
              <div><span>Volume</span><strong>${formatNumber(lot.volumeTon, 1)}t</strong></div>
              <div><span>Area</span><strong>${formatNumber(area, 1)}ha</strong></div>
              <div><span>Reduction</span><strong>${formatNumber(lot.estimatedReductionTco2e, 1)}t</strong></div>
            </div>
            <section class="report-section">
              <h3>AWD Evidence Summary</h3>
              <div class="grid three mt-14">
                ${metricCard('참여 필지', `${parcels.length}개`, '익명 필지코드 기준')}
                ${metricCard('평균 AWD 점수', `${avgAwd}점`, 'RF 모델 결과 proxy')}
                ${metricCard('증빙 완료율', `${evidenceRate}%`, '데이터룸 상태 평균')}
              </div>
            </section>
            <section class="report-section">
              <h3>Included Parcels</h3>
              ${renderParcelTable(parcels, { compact: true })}
            </section>
            <section class="report-section">
              <h3>Evidence Checklist</h3>
              <div class="evidence-grid">
                ${Object.values(evidenceMeta).map((meta) => `<div class="evidence-card"><span class="step-num">${meta.icon}</span><strong>${meta.label}</strong><p>Lot 단위 리포트 반영 대상</p>${evidenceBadge('COLLECTED')}</div>`).join('')}
              </div>
            </section>
            <section class="report-section callout warning">
              본 화면은 현재 구현된 운영 대시보드의 데이터를 바이어 제출 양식으로 전환했을 때의 바이어 리포트(Mock-Up)입니다. 인증서 또는 탄소크레딧 발행 문서가 아닙니다.
            </section>
          </div>
        </article>
        <aside class="card pad no-print">
          <h2>Report Control</h2>
          <p class="subtle mt-6">브라우저 인쇄 기능에서 “PDF로 저장”을 선택하면 서버 없이 리포트 파일을 만들 수 있습니다.</p>
          <label class="field mt-18"><span class="label">Lot</span><select id="lotSelect">${DATA.buyerLots.map((item) => `<option value="${item.lotId}" ${item.lotId === lot.lotId ? 'selected' : ''}>${item.lotId} · ${item.region}</option>`).join('')}</select></label>
          <div class="detail-list mt-14">
            ${detailRow('AWD Period', lot.awdPeriod)}
            ${detailRow('Report Status', lot.reportStatus)}
            ${detailRow('Buyer Use', lot.buyerUse)}
          </div>
          <div class="button-row mt-18">
            <button class="btn" data-print-report="true">PDF로 저장/인쇄</button>
            <button class="btn secondary" data-copy-report="${lot.lotId}">리포트 요약 복사</button>
          </div>
        </aside>
      </section>
    `;
  }

  function renderPassport() {
    const lot = DATA.buyerLots.find((item) => item.lotId === state.selectedLotId) || DATA.buyerLots[0];
    const parcels = lot.parcelIds.map((id) => getParcel(id)).filter(Boolean);
    const area = parcels.reduce((sum, p) => sum + p.areaHa, 0);
    return `
      <section class="card pad">
        <span class="mockup-label">Product Passport(Mock-Up)</span>
        <div class="passport-hero mt-18">
          <div>
            <p class="eyebrow">Agri-I 저탄소 AWD 쌀</p>
            <h2 style="font-size: clamp(34px, 5vw, 58px); line-height: 1; margin:0; letter-spacing:-0.06em;">QR 기반 생산 이력과 저탄소 스토리</h2>
            <p class="subtle mt-18">쌀 포장지 QR을 통해 생산지역, 필지 요약, AWD 이행 기간, 예상 감축량을 확인하는 향후 제품 단위 가치증명 화면입니다.</p>
            <div class="button-row mt-18 no-print"><a class="btn" href="#/buyer-report">바이어 리포트(Mock-Up) 보기</a><button class="btn secondary" data-copy-passport="${lot.lotId}">패스포트 링크 복사</button></div>
          </div>
          <div class="qr-box" aria-label="Demo QR pattern"></div>
        </div>
      </section>
      <section class="grid two">
        <article class="product-bag">
          <div><span>LOW-CARBON AWD RICE</span><strong>Agri-I Rice</strong></div>
          <div class="subtle">${lot.region} · ${lot.lotId}<br />AWD Period: ${lot.awdPeriod}</div>
        </article>
        <article class="card pad">
          <h2>Lot Passport</h2>
          <div class="detail-list">
            ${detailRow('생산지역', lot.region)}
            ${detailRow('필지 수', `${parcels.length}개`)}
            ${detailRow('관리 면적', `${formatNumber(area, 1)} ha`)}
            ${detailRow('예상 물량', `${formatNumber(lot.volumeTon, 1)} t`)}
            ${detailRow('감축 추정', `${formatNumber(lot.estimatedReductionTco2e, 1)} tCO₂e`)}
            ${detailRow('검증 상태', 'Mock-Up')}
          </div>
        </article>
      </section>
      <section class="card pad">
        <h2>저탄소 스토리</h2>
        <p class="subtle mt-10">본 lot은 AWD 물관리로 논의 장기 침수 상태를 줄이고, 필지 단위 관측 데이터와 증빙 체크리스트를 통해 바이어 제출 자료의 기초 데이터를 구성하는 시나리오입니다. 실제 인증 완료 또는 탄소크레딧 발행을 의미하지 않습니다.</p>
      </section>
    `;
  }

  function renderMethodology() {
    return `
      <section class="card pad">
        <h2>Methodology</h2>
        <p class="subtle mt-6">0단계 프로토타입은 AWD 기반 저탄소농업 dMRV 대시보드에 한정합니다. 바이어 리포트(Mock-Up), 제품 패스포트, 탄소크레딧 흐름은 대시보드 이후 출력물 예시입니다.</p>
        <div class="method-grid mt-18">
          ${methodStep(1, '필지 경계', '익명화된 GeoJSON 폴리곤을 등록하고 필지·농가코드 단위로 관리합니다.')}
          ${methodStep(2, '위성·기상 proxy', 'Sentinel/Landsat/ERA5/AWS 기반 데이터를 전처리했다고 가정한 JSON 시계열을 표시합니다.')}
          ${methodStep(3, 'AWD 이행 추정', '수분지수와 침수·건조 패턴을 바탕으로 AWD 상태와 모델 신뢰도를 계산합니다.')}
          ${methodStep(4, '감축량 산정', 'RF 모델 결과 proxy를 사용해 필지별 예상 CH₄ 감축량을 누적 시각화합니다.')}
          ${methodStep(5, '증빙 데이터룸', '위성, 기상, 농가 활동 기록, 사진, 경계 데이터의 수집 상태를 체크합니다.')}
          ${methodStep(6, '바이어 출력물', '대시보드 데이터를 바이어 리포트(Mock-Up)와 제품 패스포트로 전환하는 흐름을 보여줍니다.')}
        </div>
      </section>
      <section class="grid two">
        <article class="card pad">
          <h2>구현 원칙</h2>
          <div class="callout mt-14">서버, DB, 로그인, API 키를 사용하지 않습니다. 모든 화면은 정적 HTML/CSS/JavaScript와 브라우저 localStorage로만 동작합니다.</div>
          <div class="callout warning mt-14">실제 농가 개인정보, 원본 좌표, 계약정보, 바이어 협상 정보는 GitHub public repository에 업로드하면 안 됩니다.</div>
        </article>
        <article class="card pad">
          <h2>모델 표현 원칙</h2>
          <p class="subtle mt-10">AI가 인증한다는 표현을 피하고, “AI는 MRV 자료 생성과 검증 비용 절감을 지원한다”는 보조 도구 관점으로 설명합니다.</p>
          <div class="detail-list mt-14">
            ${detailRow('AWD RF Model', 'R² = 0.85 demo')}
            ${detailRow('SOC/Biochar', '2단계 고도화 영역')}
            ${detailRow('Carbon Credit', '2단계 성장엔진')}
          </div>
        </article>
      </section>
    `;
  }

  function methodStep(num, title, body) {
    return `<article class="method-step"><div class="step-num">${num}</div><h3>${title}</h3><p class="subtle mt-10">${body}</p></article>`;
  }

  function renderGuide() {
    return `
      <section class="card pad">
        <h2>GitHub Pages 배포 Guide</h2>
        <p class="subtle mt-6">이 저장소는 빌드 과정 없이 정적 파일만으로 배포됩니다.</p>
        <div class="method-grid mt-18">
          ${methodStep(1, 'Repository 생성', 'agri-i-awd-dmrv-dashboard 같은 public repository를 만듭니다.')}
          ${methodStep(2, '파일 커밋', '이 폴더의 index.html, assets, data, .github 파일을 그대로 커밋합니다.')}
          ${methodStep(3, 'Pages 활성화', 'Settings → Pages → GitHub Actions 또는 main/root 배포를 선택합니다.')}
          ${methodStep(4, '접속 확인', 'https://{계정}.github.io/{저장소}/ 형태의 URL에서 확인합니다.')}
          ${methodStep(5, '데이터 교체', 'data/*.json 또는 assets/js/data.js의 샘플 데이터를 익명화 데이터로 교체합니다.')}
          ${methodStep(6, '민감정보 제외', '.env, API key, 개인정보, 실제 계약정보는 절대 커밋하지 않습니다.')}
        </div>
      </section>
      <section class="card pad">
        <h2>필요 정보 / Key</h2>
        <div class="detail-list">
          ${detailRow('API Key', '필요 없음')}
          ${detailRow('Server', '필요 없음')}
          ${detailRow('Database', '필요 없음')}
          ${detailRow('GitHub Pages', 'public repository 권장')}
          ${detailRow('Data Update', 'assets/js/data.js 또는 data/*.json 교체')}
          ${detailRow('PDF', '브라우저 인쇄 → PDF 저장')}
        </div>
      </section>
    `;
  }

  function lineChart(rows, xKey, yKey, options = {}) {
    const valid = rows.filter((row) => row[yKey] !== null && row[yKey] !== undefined && !Number.isNaN(Number(row[yKey])));
    if (!valid.length) return `<div class="callout warning">표시할 데이터가 없습니다.</div>`;
    const width = 620;
    const height = 230;
    const pad = { l: 46, r: 18, t: 18, b: 34 };
    const values = valid.map((row) => Number(row[yKey]));
    let min = Math.min(...values);
    let max = Math.max(...values);
    const margin = Math.max(0.1, (max - min) * 0.18);
    min -= margin; max += margin;
    if (options.yLabel === 'NDWI') { min = Math.min(min, -0.45); max = Math.max(max, 0.6); }
    const x = (index) => pad.l + (index / Math.max(1, valid.length - 1)) * (width - pad.l - pad.r);
    const y = (value) => pad.t + ((max - value) / (max - min || 1)) * (height - pad.t - pad.b);
    const points = valid.map((row, i) => `${x(i).toFixed(2)},${y(Number(row[yKey])).toFixed(2)}`).join(' ');
    const path = valid.map((row, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(Number(row[yKey])).toFixed(2)}`).join(' ');
    const areaPath = `${path} L ${x(valid.length - 1).toFixed(2)} ${height - pad.b} L ${pad.l} ${height - pad.b} Z`;
    const grid = [0, 1, 2, 3, 4].map((i) => {
      const gy = pad.t + i * ((height - pad.t - pad.b) / 4);
      const val = max - i * ((max - min) / 4);
      return `<line class="chart-grid" x1="${pad.l}" y1="${gy}" x2="${width - pad.r}" y2="${gy}"></line><text class="chart-label" x="8" y="${gy + 4}">${formatNumber(val, options.yLabel === 'NDWI' ? 1 : 0)}</text>`;
    }).join('');
    const labels = valid.filter((_, i) => i === 0 || i === Math.floor(valid.length / 2) || i === valid.length - 1).map((row, i, arr) => {
      const idx = valid.indexOf(row);
      return `<text class="chart-label" x="${x(idx)}" y="${height - 9}" text-anchor="middle">${String(row[xKey]).slice(5)}</text>`;
    }).join('');
    const dots = valid.map((row, i) => `<circle class="chart-dot" cx="${x(i).toFixed(2)}" cy="${y(Number(row[yKey])).toFixed(2)}" r="3.7" fill="${options.color || '#0f8f59'}"></circle>`).join('');
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${yKey} chart">
      ${grid}
      <line class="chart-axis" x1="${pad.l}" y1="${height - pad.b}" x2="${width - pad.r}" y2="${height - pad.b}"></line>
      ${options.area ? `<path class="chart-area" d="${areaPath}" fill="${options.color || '#0f8f59'}"></path>` : ''}
      <path class="chart-line" d="${path}" stroke="${options.color || '#0f8f59'}"></path>
      ${dots}${labels}
    </svg>`;
  }

  function barChart(rows, xKey, yKey, options = {}) {
    const valid = rows.filter((row) => row[yKey] !== null && row[yKey] !== undefined && !Number.isNaN(Number(row[yKey])));
    if (!valid.length) return `<div class="callout warning">표시할 데이터가 없습니다.</div>`;
    const width = 620;
    const height = 230;
    const pad = { l: 44, r: 18, t: 18, b: 34 };
    const values = valid.map((row) => Number(row[yKey]));
    const max = Math.max(...values, 1) * 1.18;
    const xStep = (width - pad.l - pad.r) / valid.length;
    const barW = Math.max(8, xStep * 0.62);
    const y = (value) => pad.t + ((max - value) / max) * (height - pad.t - pad.b);
    const grid = [0, 1, 2, 3, 4].map((i) => {
      const gy = pad.t + i * ((height - pad.t - pad.b) / 4);
      const val = max - i * (max / 4);
      return `<line class="chart-grid" x1="${pad.l}" y1="${gy}" x2="${width - pad.r}" y2="${gy}"></line><text class="chart-label" x="8" y="${gy + 4}">${formatNumber(val, 0)}</text>`;
    }).join('');
    const bars = valid.map((row, i) => {
      const bx = pad.l + i * xStep + (xStep - barW) / 2;
      const by = y(Number(row[yKey]));
      const h = height - pad.b - by;
      return `<rect class="bar" x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" fill="${options.color || '#2f8edb'}"></rect>`;
    }).join('');
    const labels = valid.filter((_, i) => i === 0 || i === Math.floor(valid.length / 2) || i === valid.length - 1).map((row) => {
      const idx = valid.indexOf(row);
      return `<text class="chart-label" x="${pad.l + idx * xStep + xStep / 2}" y="${height - 9}" text-anchor="middle">${String(row[xKey]).slice(5)}</text>`;
    }).join('');
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${yKey} chart">
      ${grid}<line class="chart-axis" x1="${pad.l}" y1="${height - pad.b}" x2="${width - pad.r}" y2="${height - pad.b}"></line>${bars}${labels}
    </svg>`;
  }

  function bindPageEvents() {
    document.querySelectorAll('[data-select-parcel]').forEach((button) => {
      button.addEventListener('click', () => setSelectedParcel(button.getAttribute('data-select-parcel')));
    });
    document.querySelectorAll('.map-poly').forEach((poly) => {
      poly.addEventListener('click', () => setSelectedParcel(poly.getAttribute('data-parcel-id')));
    });
    document.querySelectorAll('[data-load-monitoring]').forEach((button) => {
      button.addEventListener('click', () => setSelectedParcel(button.getAttribute('data-load-monitoring'), '#/monitoring'));
    });
    document.querySelectorAll('[data-copy-boundary]').forEach((button) => {
      button.addEventListener('click', () => copyBoundary(button.getAttribute('data-copy-boundary')));
    });
    document.querySelectorAll('[data-demo-action]').forEach((button) => {
      button.addEventListener('click', () => toast(`Demo action: ${button.getAttribute('data-demo-action')}. 실제 경계 편집은 1단계에서 서버/권한 구조와 함께 구현합니다.`));
    });

    const filterRegion = document.getElementById('filterRegion');
    const filterStatus = document.getElementById('filterStatus');
    const filterBuyer = document.getElementById('filterBuyer');
    const filterQuery = document.getElementById('filterQuery');
    if (filterRegion) filterRegion.addEventListener('change', (e) => { state.filters.region = e.target.value; render(); });
    if (filterStatus) filterStatus.addEventListener('change', (e) => { state.filters.status = e.target.value; render(); });
    if (filterBuyer) filterBuyer.addEventListener('change', (e) => { state.filters.buyer = e.target.value; render(); });
    if (filterQuery) filterQuery.addEventListener('input', debounce((e) => { state.filters.query = e.target.value; render(); }, 220));

    const csvImport = document.getElementById('csvImport');
    if (csvImport) csvImport.addEventListener('change', handleCsvImport);

    document.querySelectorAll('[data-export]').forEach((button) => {
      button.addEventListener('click', () => {
        const type = button.getAttribute('data-export');
        if (type === 'csv') exportCsv();
        if (type === 'geojson') exportGeoJson();
      });
    });

    document.querySelectorAll('[data-clear-overrides]').forEach((button) => {
      button.addEventListener('click', () => {
        state.parcelOverrides = {};
        saveOverrides();
        toast('브라우저 수정값을 초기화했습니다.');
        render();
      });
    });

    const monitorParcelSelect = document.getElementById('monitorParcelSelect');
    if (monitorParcelSelect) monitorParcelSelect.addEventListener('change', (e) => setSelectedParcel(e.target.value));
    const evidenceParcelSelect = document.getElementById('evidenceParcelSelect');
    if (evidenceParcelSelect) evidenceParcelSelect.addEventListener('change', (e) => setSelectedParcel(e.target.value));
    const lotSelect = document.getElementById('lotSelect');
    if (lotSelect) lotSelect.addEventListener('change', (e) => { state.selectedLotId = e.target.value; render(); });

    document.querySelectorAll('[data-print-report]').forEach((button) => button.addEventListener('click', () => window.print()));
    document.querySelectorAll('[data-copy-report]').forEach((button) => button.addEventListener('click', () => copyReport(button.getAttribute('data-copy-report'))));
    document.querySelectorAll('[data-copy-passport]').forEach((button) => button.addEventListener('click', () => copyText(`${location.origin}${location.pathname}#/passport?lot=${button.getAttribute('data-copy-passport')}`, '패스포트 링크를 복사했습니다.')));
    document.querySelectorAll('[data-copy-summary]').forEach((button) => button.addEventListener('click', () => copyFieldSummary(button.getAttribute('data-copy-summary'))));
    document.querySelectorAll('[data-export-field]').forEach((button) => button.addEventListener('click', () => exportFieldData(button.getAttribute('data-export-field'))));
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function copyBoundary(parcelId) {
    const feature = getParcelFeatures().find((f) => f.properties.parcelId === parcelId);
    copyText(JSON.stringify(feature, null, 2), '필지 GeoJSON을 복사했습니다.');
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      toast(successMessage);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      toast(successMessage);
    }
  }

  function copyFieldSummary(parcelId) {
    const p = getParcel(parcelId);
    const text = `${p.parcelId} / ${p.region} / ${p.areaHa}ha / AWD ${p.awdScore}점 / 감축 추정 ${p.estimatedReductionTco2e} tCO2e / 증빙 ${p.evidenceRate}%`;
    copyText(text, '필지 요약을 복사했습니다.');
  }

  function copyReport(lotId) {
    const lot = DATA.buyerLots.find((item) => item.lotId === lotId) || DATA.buyerLots[0];
    const text = `바이어 리포트(Mock-Up): ${lot.lotId}, ${lot.region}, ${lot.volumeTon}t, 예상 감축 ${lot.estimatedReductionTco2e} tCO2e, 기간 ${lot.awdPeriod}`;
    copyText(text, '리포트 요약을 복사했습니다.');
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  function exportCsv() {
    const rows = getParcels();
    const headers = ['parcelId','farmerCode','region','farmName','areaHa','status','awdScore','evidenceRate','buyerCandidate','estimatedReductionTco2e','lat','lon','lastUpdate'];
    const csv = [headers.join(',')].concat(rows.map((row) => headers.map((h) => csvCell(row[h])).join(','))).join('\n');
    downloadBlob('agri-i-parcels.csv', csv, 'text/csv;charset=utf-8');
    toast('CSV 파일을 다운로드했습니다.');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportGeoJson() {
    const features = getParcelFeatures();
    downloadBlob('agri-i-parcels.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 2), 'application/geo+json;charset=utf-8');
    toast('GeoJSON 파일을 다운로드했습니다.');
  }

  function exportFieldData(parcelId) {
    const payload = {
      parcel: getParcel(parcelId),
      observations: getObservations(parcelId),
      evidence: getEvidence(parcelId)
    };
    downloadBlob(`${parcelId}-dmrv-data.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    toast('필지 데이터를 다운로드했습니다.');
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

  function handleCsvImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { toast('CSV 행이 부족합니다.'); return; }
      const headers = parseCsvLine(lines[0]).map((h) => h.trim());
      let count = 0;
      lines.slice(1).forEach((line) => {
        const values = parseCsvLine(line);
        const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
        const id = row.parcelId;
        if (!id || !getParcels().some((p) => p.parcelId === id)) return;
        const allowed = {};
        if (row.status && statusMeta[row.status]) allowed.status = row.status;
        if (row.awdScore !== undefined && row.awdScore !== '') allowed.awdScore = clamp(Number(row.awdScore), 0, 100);
        if (row.evidenceRate !== undefined && row.evidenceRate !== '') allowed.evidenceRate = clamp(Number(row.evidenceRate), 0, 100);
        if (row.buyerCandidate !== undefined && row.buyerCandidate !== '') allowed.buyerCandidate = String(row.buyerCandidate).toLowerCase() === 'true';
        if (Object.keys(allowed).length) {
          state.parcelOverrides[id] = { ...(state.parcelOverrides[id] || {}), ...allowed };
          count += 1;
        }
      });
      saveOverrides();
      toast(`${count}개 필지 수정값을 반영했습니다.`);
      render();
    };
    reader.readAsText(file, 'utf-8');
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  setupScenarioSelect();
  setupStaticEvents();
  render();
})();
