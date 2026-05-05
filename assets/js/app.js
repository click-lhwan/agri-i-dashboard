/* Compatibility polyfills for older Chromium browsers used in offline demos. */
(function () {
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
      var target = String(this);
      if (search instanceof RegExp) return target.replace(search, replacement);
      return target.split(String(search)).join(String(replacement));
    };
  }
  if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
      return String(this).indexOf(String(search), start || 0) !== -1;
    };
  }
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (searchElement, fromIndex) {
      var len = this.length >>> 0;
      var i = Math.max(fromIndex || 0, 0);
      while (i < len) {
        if (this[i] === searchElement || (this[i] !== this[i] && searchElement !== searchElement)) return true;
        i += 1;
      }
      return false;
    };
  }
  if (!Array.prototype.find) {
    Array.prototype.find = function (predicate, thisArg) {
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      for (var i = 0; i < this.length; i += 1) {
        if (predicate.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (callback, thisArg) {
      var result = [];
      for (var i = 0; i < this.length; i += 1) {
        var mapped = callback.call(thisArg, this[i], i, this);
        if (Array.isArray(mapped)) {
          for (var j = 0; j < mapped.length; j += 1) result.push(mapped[j]);
        } else {
          result.push(mapped);
        }
      }
      return result;
    };
  }
  if (!Array.from) {
    Array.from = function (arrayLike) {
      var result = [];
      if (!arrayLike) return result;
      if (typeof arrayLike.length === 'number') {
        for (var i = 0; i < arrayLike.length; i += 1) result.push(arrayLike[i]);
        return result;
      }
      if (typeof arrayLike.forEach === 'function') {
        arrayLike.forEach(function (item) { result.push(item); });
      }
      return result;
    };
  }
  if (!Object.fromEntries) {
    Object.fromEntries = function (entries) {
      var obj = {};
      for (var i = 0; i < entries.length; i += 1) obj[entries[i][0]] = entries[i][1];
      return obj;
    };
  }
  if (!Number.isFinite) {
    Number.isFinite = function (value) {
      return typeof value === 'number' && isFinite(value);
    };
  }
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }
  if (window.Element && !Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }
  if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      var el = this;
      while (el) {
        if (el.matches && el.matches(selector)) return el;
        el = el.parentElement;
      }
      return null;
    };
  }
}());
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
(function () {
    'use strict';
    var DATA = window.AGRII_DATA;
    var GEE_CONFIG = window.AGRII_GEE_CONFIG || { enabled: false };
    var app = document.getElementById('app');
    var pageTitle = document.getElementById('pageTitle');
    var resetDemoBtn = document.getElementById('resetDemoBtn');
    var toastEl = document.getElementById('toast');
    var modalRoot = document.getElementById('modalRoot');
    var datasetStatus = document.getElementById('datasetStatus');
    var statusMeta = {
        AWD_GOOD: { label: 'On Track', short: 'Good', className: 'status-good', color: '#0f8f59', marker: 'good' },
        WATCH: { label: 'Watch', short: 'Watch', className: 'status-watch', color: '#e2a229', marker: 'watch' },
        RISK: { label: 'Risk', short: 'Risk', className: 'status-risk', color: '#d94a4a', marker: 'risk' },
        MISSING: { label: 'Missing', short: 'Missing', className: 'status-missing', color: '#8b9891', marker: 'missing' }
    };
    var evidenceMeta = {
        SATELLITE_OBSERVATION: { label: '위성 관측', icon: '🛰️' },
        WEATHER_SERIES: { label: '기상 데이터', icon: '🌦️' },
        FARMER_ACTIVITY_LOG: { label: '농가 활동 기록', icon: '📝' },
        FIELD_PHOTO: { label: '현장 사진', icon: '📷' },
        POLYGON_BOUNDARY: { label: '필지 경계', icon: '▱' }
    };
    var titleMap = {
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
    var storageKeys = {
        selectedField: 'agrii:selectedField',
        uploadedRows: 'agrii:uploadedPredictionRows',
        dashboardMode: 'agrii:dashboardMode'
    };
    var regionMap = [
        { lat: 34.75, lon: 126.5, region: '전남 해남권', regionEn: 'Haenam cluster' },
        { lat: 35.75, lon: 126.75, region: '전북 김제권', regionEn: 'Gimje cluster' },
        { lat: 36.75, lon: 126.75, region: '충남 예산권', regionEn: 'Yesan cluster' },
        { lat: 37.0, lon: 127.0, region: '경기 평택권', regionEn: 'Pyeongtaek cluster' },
        { lat: 38.0, lon: 127.25, region: '강원 철원권', regionEn: 'Cheorwon cluster' }
    ];
    var dataset = initializeDataset();
    var initialFieldId = getInitialSelectedFieldId(dataset);
    var storedMode = localStorage.getItem(storageKeys.dashboardMode);
    var state = {
        route: 'dashboard',
        dashboardMode: storedMode === 'result' ? 'result' : 'home',
        selectedFieldId: initialFieldId,
        fieldSearch: { dashboard: '', monitoring: '', evidence: '' },
        dataSearch: '',
        selectedLotId: dataset.buyerLots && dataset.buyerLots.length ? dataset.buyerLots[0].lotId : 'LOT-2025-AWD-001'
    };
    function loadJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
        }
        catch (error) {
            return fallback;
        }
    }
    function isUsableDataset(value) {
        return Boolean(value && Array.isArray(value.fields) && value.fields.length && Array.isArray(value.predictions));
    }
    function initializeDataset() {
        var uploadedRows = loadJson(storageKeys.uploadedRows, null);
        try {
            if (Array.isArray(uploadedRows) && uploadedRows.length) {
                var uploadedDataset = buildDatasetFromRows(uploadedRows, 'Uploaded CSV in browser localStorage');
                if (isUsableDataset(uploadedDataset))
                    return uploadedDataset;
            }
        }
        catch (error) {
            console.warn('Uploaded CSV cache was ignored:', error);
        }
        localStorage.removeItem(storageKeys.uploadedRows);
        return buildDatasetFromStaticData();
    }
    function getInitialSelectedFieldId(sourceDataset) {
        var fields = sourceDataset && Array.isArray(sourceDataset.fields) ? sourceDataset.fields : [];
        var storedFieldId = localStorage.getItem(storageKeys.selectedField);
        if (storedFieldId && fields.some(function (field) { return field.parcelId === storedFieldId; }))
            return storedFieldId;
        return fields.length ? fields[0].parcelId : '';
    }
    function routeFromHash() {
        var raw = location.hash.replace(/^#\/?/, '');
        return raw || 'dashboard';
    }
    function htmlEscape(value) {
        return String(value !== null && value !== void 0 ? value : '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
    function formatNumber(value, digits) {
        if (digits === void 0) { digits = 0; }
        var number = Number(value) || 0;
        return number.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
    }
    function clamp(value, min, max) {
        if (!Number.isFinite(value))
            return min;
        return Math.min(max, Math.max(min, value));
    }
    function compactId(id) {
        return String(id).replace('FIELD-', 'F-');
    }
    function csvCell(value) {
        var text = String(value !== null && value !== void 0 ? value : '');
        return /[",\n]/.test(text) ? "\"".concat(text.replaceAll('"', '""'), "\"") : text;
    }
    function statusBadge(status) {
        var meta = statusMeta[status] || statusMeta.MISSING;
        return "<span class=\"status-pill ".concat(meta.className, "\">").concat(meta.label, "</span>");
    }
    function evidenceBadge(status) {
        var map = {
            COLLECTED: ['수집됨', 'status-good'],
            REVIEWED: ['검토 완료', 'status-good'],
            NEEDS_REVIEW: ['검토 필요', 'status-watch'],
            MISSING: ['미수집', 'status-missing']
        };
        var item = map[status] || map.MISSING;
        return "<span class=\"badge ".concat(item[1], "\">").concat(item[0], "</span>");
    }
    function toast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        window.clearTimeout(toastEl._timer);
        toastEl._timer = window.setTimeout(function () { return toastEl.classList.remove('show'); }, 2800);
    }
    function updateDatasetStatus() {
        datasetStatus.textContent = "".concat(dataset.fields.length, " fields \u00B7 ").concat(dataset.predictions.length, " rows");
    }
    function setSelectedField(parcelId, mode) {
        if (!dataset.fields.some(function (field) { return field.parcelId === parcelId; }))
            return;
        state.selectedFieldId = parcelId;
        if (mode) {
            state.dashboardMode = mode;
            localStorage.setItem(storageKeys.dashboardMode, mode);
        }
        localStorage.setItem(storageKeys.selectedField, parcelId);
        render();
    }
    function getField(id) {
        if (id === void 0) { id = state.selectedFieldId; }
        return dataset.fields.find(function (field) { return field.parcelId === id; }) || dataset.fields[0];
    }
    function getPredictions(parcelId) {
        if (parcelId === void 0) { parcelId = state.selectedFieldId; }
        return dataset.predictions.filter(function (row) { return row.parcelId === parcelId; }).sort(function (a, b) { return a.startTime.localeCompare(b.startTime); });
    }
    function getClimate(parcelId) {
        if (parcelId === void 0) { parcelId = state.selectedFieldId; }
        return dataset.climate.filter(function (row) { return row.parcelId === parcelId; }).sort(function (a, b) { return a.startTime.localeCompare(b.startTime); });
    }
    function getEvidence(parcelId) {
        if (parcelId === void 0) { parcelId = state.selectedFieldId; }
        return dataset.evidence.filter(function (row) { return row.parcelId === parcelId; });
    }
    function getSummary() {
        var fields = dataset.fields;
        var totalArea = fields.reduce(function (sum, field) { return sum + Number(field.areaHa || 0); }, 0);
        var totalCh4 = fields.reduce(function (sum, field) { return sum + Number(field.totalCh4 || 0); }, 0);
        var totalTco2e = fields.reduce(function (sum, field) { return sum + Number(field.estimatedReductionTco2e || 0); }, 0);
        var riskCount = fields.filter(function (field) { return field.status === 'RISK' || field.status === 'WATCH'; }).length;
        var goodCount = fields.filter(function (field) { return field.status === 'AWD_GOOD'; }).length;
        var avgScore = fields.reduce(function (sum, field) { return sum + Number(field.awdScoreExample || 0); }, 0) / Math.max(fields.length, 1);
        return { fieldCount: fields.length, totalArea: totalArea, totalCh4: totalCh4, totalTco2e: totalTco2e, riskCount: riskCount, goodCount: goodCount, avgScore: avgScore, rows: dataset.predictions.length };
    }
    function filterFields(query) {
        var q = String(query || '').trim().toLowerCase();
        if (!q)
            return dataset.fields;
        return dataset.fields.filter(function (field) {
            var text = "".concat(field.parcelId, " ").concat(field.serial, " ").concat(field.region, " ").concat(field.regionEn, " ").concat(field.farmName, " ").concat(field.lat, " ").concat(field.lon).toLowerCase();
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
        var cleanRows = rows
            .map(function (row) { return ({
            lat: Number(row.lat),
            lon: Number(row.lon),
            startTime: String(row.startTime),
            endTime: String(row.endTime),
            ch4Estimated: Number(row.ch4Estimated)
        }); })
            .filter(function (row) { return Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.startTime && row.endTime && Number.isFinite(row.ch4Estimated); })
            .sort(function (a, b) { return "".concat(a.lat, "|").concat(a.lon, "|").concat(a.startTime, "|").concat(a.endTime).localeCompare("".concat(b.lat, "|").concat(b.lon, "|").concat(b.startTime, "|").concat(b.endTime)); });
        if (!cleanRows.length) {
            throw new Error('유효한 CSV 행이 없습니다. 위도, 경도, 시작시간, 종료시간, CH4_추정량 컬럼을 확인하세요.');
        }
        var grouped = new Map();
        cleanRows.forEach(function (row) {
            var key = "".concat(row.lat.toFixed(6), "|").concat(row.lon.toFixed(6));
            if (!grouped.has(key))
                grouped.set(key, []);
            grouped.get(key).push(row);
        });
        var aggregates = Array.from(grouped.entries()).map(function (_a) {
            var key = _a[0], group = _a[1];
            var sum = group.reduce(function (acc, row) { return acc + row.ch4Estimated; }, 0);
            var mean = sum / Math.max(group.length, 1);
            return { key: key, group: group, mean: mean, sum: sum };
        });
        var minMean = Math.min.apply(Math, aggregates.map(function (item) { return item.mean; }));
        var maxMean = Math.max.apply(Math, aggregates.map(function (item) { return item.mean; }));
        var fields = [];
        var predictions = [];
        var climate = [];
        var evidence = [];
        var features = [];
        aggregates.sort(function (a, b) {
            var _a = a.key.split('|').map(Number), aLat = _a[0], aLon = _a[1];
            var _b = b.key.split('|').map(Number), bLat = _b[0], bLon = _b[1];
            return aLat - bLat || aLon - bLon;
        }).forEach(function (item, index) {
            var group = item.group.sort(function (a, b) { return a.startTime.localeCompare(b.startTime); });
            var lat = group[0].lat;
            var lon = group[0].lon;
            var fieldId = "FIELD-".concat(String(index + 1).padStart(3, '0'));
            var serial = String(index + 1).padStart(3, '0');
            var region = inferRegion(lat, lon, index).region;
            var regionEn = inferRegion(lat, lon, index).regionEn;
            var values = group.map(function (row) { return row.ch4Estimated; });
            var mean = item.mean;
            var total = item.sum;
            var min = Math.min.apply(Math, values);
            var max = Math.max.apply(Math, values);
            var latest = group[group.length - 1];
            var score = maxMean > minMean ? Math.round(55 + 35 * ((maxMean - mean) / (maxMean - minMean))) : 80;
            var status = score >= 75 ? 'AWD_GOOD' : (score >= 60 ? 'WATCH' : 'RISK');
            var areaHa = 0.5;
            var tco2e = total * 28 / 1000;
            var polygon = rectanglePolygon(lon, lat, 100, 50);
            var latestNdwi = 0;
            group.forEach(function (row, rowIndex) {
                var date = new Date("".concat(row.startTime, "T00:00:00"));
                var day = getDayOfYear(date);
                var ndwi = clamp(0.50 - 0.42 * (row.ch4Estimated / Math.max(max, 1)) + 0.07 * Math.sin(((day + index * 23) / 365) * Math.PI * 2), -0.12, 0.68);
                latestNdwi = rowIndex === group.length - 1 ? ndwi : latestNdwi;
                predictions.push({
                    parcelId: fieldId,
                    lat: lat,
                    lon: lon,
                    startTime: row.startTime,
                    endTime: row.endTime,
                    ch4Estimated: Number(row.ch4Estimated.toFixed(6)),
                    ch4UnitLabel: 'CSV model output',
                    co2eProxyTons: Number((row.ch4Estimated * 28 / 1000).toFixed(6)),
                    ndwiProxy: Number(ndwi.toFixed(4)),
                    waterStatusProxy: ndwi < 0.18 ? 'DRY' : (ndwi < 0.35 ? 'TRANSITION' : 'FLOODED'),
                    key: "".concat(lat.toFixed(6), "|").concat(lon.toFixed(6), "|").concat(row.startTime, "|").concat(row.endTime)
                });
                climate.push(generateClimateRow(fieldId, lat, lon, row.startTime, row.endTime, rowIndex, index));
            });
            var props = {
                parcelId: fieldId,
                serial: serial,
                farmerCode: "F-".concat(serial),
                region: region,
                regionEn: regionEn,
                farmName: "".concat(region, " AWD \uBD84\uC11D \uBD80\uC9C0 ").concat(serial),
                areaHa: areaHa,
                footprint: '100m x 50m demo footprint',
                crop: 'rice',
                status: status,
                awdScoreExample: score,
                awdScoreTag: 'for example',
                evidenceRate: status === 'AWD_GOOD' ? 92 : (status === 'WATCH' ? 76 : 58),
                buyerCandidate: index % 2 === 1,
                lat: lat,
                lon: lon,
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
            evidence.push.apply(evidence, generateEvidenceRows(props));
        });
        return {
            fields: fields,
            predictions: predictions,
            climate: climate,
            koreaClimateSummary: DATA.koreaClimateSummary,
            evidence: evidence,
            buyerLots: [{ lotId: 'LOT-UPLOADED-AWD-001', name: 'Uploaded CSV AWD 분석 Lot', parcelIds: fields.map(function (field) { return field.parcelId; }), region: '업로드 CSV 위치', volumeTon: fields.length * 2.5, estimatedReductionTco2e: Number(fields.reduce(function (sum, f) { return sum + f.estimatedReductionTco2e; }, 0).toFixed(3)), reportStatus: 'Mock-Up Ready' }],
            parcelsGeoJSON: { type: 'FeatureCollection', features: features },
            dataSourceLabel: sourceLabel,
            isUploaded: sourceLabel.includes('Uploaded')
        };
    }
    function inferRegion(lat, lon, fallbackIndex) {
        var found = regionMap.find(function (item) { return Math.abs(item.lat - lat) < 0.011 && Math.abs(item.lon - lon) < 0.011; });
        if (found)
            return { region: found.region, regionEn: found.regionEn };
        if (lat >= 37.7)
            return { region: '강원/경기 북부권', regionEn: 'Northern Korea cluster' };
        if (lat >= 36.6)
            return { region: '충청권', regionEn: 'Chungcheong cluster' };
        if (lat >= 35.4)
            return { region: '전북권', regionEn: 'Jeonbuk cluster' };
        if (lat >= 34.3)
            return { region: '전남권', regionEn: 'Jeonnam cluster' };
        return { region: "\uC5C5\uB85C\uB4DC \uC704\uCE58 ".concat(fallbackIndex + 1), regionEn: "Uploaded location ".concat(fallbackIndex + 1) };
    }
    function rectanglePolygon(lon, lat, widthM, heightM) {
        var halfW = widthM / 2;
        var halfH = heightM / 2;
        var dLat = halfH / 110574;
        var dLon = halfW / (111320 * Math.cos(lat * Math.PI / 180));
        return [[lon - dLon, lat - dLat], [lon + dLon, lat - dLat], [lon + dLon, lat + dLat], [lon - dLon, lat + dLat], [lon - dLon, lat - dLat]];
    }
    function getDayOfYear(date) {
        var start = new Date(date.getFullYear(), 0, 0);
        return Math.floor((date - start) / 86400000);
    }
    function generateClimateRow(parcelId, lat, lon, startTime, endTime, rowIndex, fieldIndex) {
        var date = new Date("".concat(startTime, "T00:00:00"));
        var day = getDayOfYear(date);
        var temp = 12.5 + 13.2 * Math.sin(((day - 82) / 365) * Math.PI * 2) - 0.55 * (lat - 36) + 0.8 * Math.sin(rowIndex * 1.7 + fieldIndex);
        var rain = Math.max(0, 3.5 + 10.5 * Math.sin(((day - 160) / 365) * Math.PI * 2) + 4.0 * Math.sin(rowIndex * 0.83 + fieldIndex) + (fieldIndex % 3) * 0.8);
        return {
            parcelId: parcelId,
            lat: lat,
            lon: lon,
            startTime: startTime,
            endTime: endTime,
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
        var statusMap = {
            AWD_GOOD: ['REVIEWED', 'COLLECTED', 'REVIEWED', 'COLLECTED', 'REVIEWED'],
            WATCH: ['COLLECTED', 'COLLECTED', 'NEEDS_REVIEW', 'MISSING', 'REVIEWED'],
            RISK: ['NEEDS_REVIEW', 'COLLECTED', 'NEEDS_REVIEW', 'MISSING', 'COLLECTED']
        };
        var _a = statusMap[field.status] || statusMap.WATCH, satellite = _a[0], weather = _a[1], log = _a[2], photo = _a[3], boundary = _a[4];
        var rows = [
            ['SATELLITE_OBSERVATION', satellite, 'Sentinel-2 cloudless 2024 / optional GEE Sentinel-2 SR'],
            ['WEATHER_SERIES', weather, 'data/climate_observations.csv; target source ERA5 or KMA ASOS/AWS'],
            ['FARMER_ACTIVITY_LOG', log, 'Demo activity log; replace with field record'],
            ['FIELD_PHOTO', photo, 'Demo placeholder; no upload storage on GitHub Pages'],
            ['POLYGON_BOUNDARY', boundary, '100m x 50m generated footprint from CSV lat/lon']
        ];
        return rows.map(function (_a) {
            var evidenceType = _a[0], status = _a[1], source = _a[2];
            return ({ parcelId: field.parcelId, evidenceType: evidenceType, status: status, date: field.lastUpdate, source: source, confidence: status === 'REVIEWED' ? 'HIGH' : (status === 'COLLECTED' ? 'MEDIUM' : 'LOW') });
        });
    }
    function render() {
        try {
            if (!dataset || !dataset.fields || !dataset.fields.length)
                dataset = buildDatasetFromStaticData();
            if (!dataset.fields.some(function (field) { return field.parcelId === state.selectedFieldId; }))
                state.selectedFieldId = dataset.fields[0].parcelId;
            state.route = routeFromHash();
            pageTitle.textContent = titleMap[state.route] || titleMap.dashboard;
            updateNav();
            updateDatasetStatus();
            var renderers = {
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
            var renderer = renderers[state.route] || renderDashboard;
            app.innerHTML = renderer();
        }
        catch (error) {
            console.error('Agri-I render failed:', error);
            localStorage.removeItem(storageKeys.uploadedRows);
            dataset = buildDatasetFromStaticData();
            state.selectedFieldId = dataset.fields[0].parcelId;
            pageTitle.textContent = 'Dashboard';
            updateDatasetStatus();
            app.innerHTML = "<section class=\"card pad\"><h2>\uD654\uBA74 \uB80C\uB354\uB9C1\uC744 \uBCF5\uAD6C\uD588\uC2B5\uB2C8\uB2E4</h2><p class=\"subtle mt-6\">\uBE0C\uB77C\uC6B0\uC800\uC5D0 \uB0A8\uC544 \uC788\uB358 \uC774\uC804 \uC5C5\uB85C\uB4DC \uB370\uC774\uD130\uB098 \uCE90\uC2DC \uB54C\uBB38\uC5D0 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uAE30\uBCF8 <code>ch4_predictions.csv</code> \uB370\uC774\uD130\uB85C \uBCF5\uC6D0\uD588\uC2B5\uB2C8\uB2E4.</p><div class=\"button-row mt-18\"><button class=\"btn\" data-action=\"dashboard-home\">Dashboard \uB2E4\uC2DC \uC5F4\uAE30</button><button class=\"btn secondary\" data-action=\"clear-uploaded-csv\">\uC5C5\uB85C\uB4DC \uB370\uC774\uD130 \uCD08\uAE30\uD654</button></div></section>";
        }
    }
    function updateNav() {
        var items = document.querySelectorAll('[data-route]');
        for (var i = 0; i < items.length; i += 1) {
            var el = items[i];
            var key = el.getAttribute('data-route');
            el.classList.toggle('active', key === state.route);
        }
    }
    function renderLanding() {
        var summary = getSummary();
        return "\n      <section class=\"card hero\">\n        <div class=\"hero-copy\">\n          <p class=\"eyebrow\">Agri-I Prototype</p>\n          <h2>AWD \uAE30\uBC18<br />\uC800\uD0C4\uC18C \uC300 dMRV<br />\uC6B4\uC601 \uB300\uC2DC\uBCF4\uB4DC</h2>\n          <p>\n            <code>ch4_predictions.csv</code>\uC758 \uC704\uACBD\uB3C4\u00B7\uC2DC\uAC04\u00B7CH4 \uCD94\uC815\uB7C9\uC744 \uAE30\uBC18\uC73C\uB85C \uD544\uC9C0 \uC218, \uAC10\uCD95\uB7C9, \uBAA8\uB2C8\uD130\uB9C1 \uACB0\uACFC\uB97C \uAC31\uC2E0\uD558\uB294 GitHub Pages \uC815\uC801 \uC6F9 \uD504\uB85C\uD1A0\uD0C0\uC785\uC785\uB2C8\uB2E4.\n          </p>\n          <div class=\"button-row\">\n            <a class=\"btn\" href=\"#/dashboard\">Dashboard \uC5F4\uAE30</a>\n            <a class=\"btn secondary\" href=\"#/data-processing\">CSV \uC5C5\uB85C\uB4DC</a>\n            <a class=\"btn secondary\" href=\"#/buyer-report\">\uBC14\uC774\uC5B4 \uB9AC\uD3EC\uD2B8(Mock-Up)</a>\n          </div>\n          <div class=\"callout warning mt-18\">\n            \uD604\uC7AC \uAD6C\uD604 \uBC94\uC704\uB294 AWD \uAE30\uBC18 \uD544\uC9C0 \uBAA8\uB2C8\uD130\uB9C1 \uB300\uC2DC\uBCF4\uB4DC\uC785\uB2C8\uB2E4. AWD Score\uB294 \uC2E4\uC81C \uC778\uC99D \uC810\uC218\uAC00 \uC544\uB2C8\uB77C CSV \uAE30\uBC18 \uC0C1\uB300\uC9C0\uD45C\uB85C \uACC4\uC0B0\uD55C <strong>AWD Score (for example)</strong>\uC785\uB2C8\uB2E4.\n          </div>\n        </div>\n        <div class=\"hero-visual\">\n          <div class=\"mock-window\">\n            <div class=\"card-header\">\n              <div>\n                <h3>CSV-driven overview</h3>\n                <p class=\"subtle mt-6\">No server \u00B7 no DB \u00B7 optional GEE only</p>\n              </div>\n              ".concat(statusBadge(summary.riskCount ? 'WATCH' : 'AWD_GOOD'), "\n            </div>\n            <div class=\"satellite-frame\" style=\"min-height: 305px;\">").concat(renderSatelliteTileMap({ centerLat: 36.4, centerLon: 127.8, zoom: 6, markers: dataset.fields, mode: 'home' }), "</div>\n            <div class=\"grid three mt-14\">\n              ").concat(miniMetric("".concat(formatNumber(summary.fieldCount), "\uAC1C"), 'CSV 고유 위치'), "\n              ").concat(miniMetric("".concat(formatNumber(summary.totalTco2e, 1), "t"), 'CO₂e 환산 예시'), "\n              ").concat(miniMetric("".concat(formatNumber(summary.rows), "\uD589"), 'CH4 예측 행'), "\n            </div>\n          </div>\n        </div>\n      </section>\n      <section class=\"grid three\">\n        ").concat(featureCard('Data Processing', '동일 구조 CSV를 업로드하고 위도·경도·시간 Key 중복을 관리자 선택으로 처리합니다.', '⇪'), "\n        ").concat(featureCard('Dashboard Home/Search Result', 'Home은 한반도 전체 Sentinel-2 위성뷰, Search Result는 선택 부지 100m×50m 위성뷰를 보여줍니다.', '▦'), "\n        ").concat(featureCard('Monitoring & Evidence', '필드 선택은 검색형으로 바꾸어 수천 개 필지 확장에 대비했습니다.', '⌁'), "\n      </section>\n    ");
    }
    function featureCard(title, body, icon) {
        return "<article class=\"card pad\"><div class=\"step-num\">".concat(icon, "</div><h3>").concat(title, "</h3><p class=\"subtle mt-10\">").concat(body, "</p></article>");
    }
    function miniMetric(value, label) {
        return "<div class=\"card pad\" style=\"box-shadow:none;\"><strong style=\"font-size:25px;\">".concat(value, "</strong><div class=\"subtle mt-6\">").concat(label, "</div></div>");
    }
    function renderDashboard() {
        return state.dashboardMode === 'result' ? renderDashboardResult() : renderDashboardHome();
    }
    function renderDashboardHome() {
        var summary = getSummary();
        var deficient = dataset.fields.filter(function (field) { return field.status === 'RISK' || field.status === 'WATCH'; }).sort(function (a, b) { return a.awdScoreExample - b.awdScoreExample; });
        return "\n      ".concat(renderKpis(summary), "\n      <section class=\"grid dashboard\">\n        <div class=\"grid\">\n          <article class=\"card pad\">\n            <div class=\"card-header\">\n              <div>\n                <h2>Satellite View \u00B7 Home</h2>\n                <p class=\"subtle mt-6\">\uD55C\uBC18\uB3C4 \uC804\uCCB4 Sentinel-2 Cloudless \uC704\uC131\uBDF0\uC5D0\uC11C CSV \uC704\uCE58\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4.</p>\n              </div>\n              <span class=\"tag\">Sentinel-2</span>\n            </div>\n            <div class=\"satellite-frame\">").concat(renderSatelliteTileMap({ centerLat: 36.4, centerLon: 127.8, zoom: 6, markers: dataset.fields, mode: 'home' }), "</div>\n            <p class=\"map-caption\">Source: ").concat(htmlEscape(DATA.sources.satellite.attribution), ". GEE live mode is optional and disabled by default.</p>\n            ").concat(renderLegend(), "\n          </article>\n          <section class=\"grid two\">\n            <article class=\"card pad\">\n              <h3>\uD55C\uAD6D \uAE30\uD6C4 \uB370\uC774\uD130 \u00B7 \uD3C9\uB144 vs \uC608\uB144</h3>\n              <p class=\"subtle mt-6\">\uC704\uCE58: <code>data/korea_climate_summary.csv</code> \u00B7 \uCD9C\uCC98: \uB370\uBAA8 CSV, \uC2E4\uC81C \uC804\uD658 \uB300\uC0C1\uC740 KMA \uAE30\uD6C4\uD3C9\uB144/ASOS \uB610\uB294 ERA5 \uC9D1\uACC4</p>\n              <div class=\"chart-box\">").concat(dualLineChart(dataset.koreaClimateSummary, 'month', 'normalTemperatureC', 'previousYearTemperatureC', { labelA: '평년 기온', labelB: '예년 기온', unit: '°C', colorA: '#0f8f59', colorB: '#e2a229' }), "</div>\n            </article>\n            <article class=\"card pad\">\n              <h3>\uD55C\uAD6D \uAC15\uC218 \uB370\uC774\uD130 \u00B7 \uD3C9\uB144 vs \uC608\uB144</h3>\n              <p class=\"subtle mt-6\">\uC704\uCE58: <code>data/korea_climate_summary.csv</code> \u00B7 \uCD9C\uCC98 \uD45C\uAE30 \uD3EC\uD568</p>\n              <div class=\"chart-box\">").concat(dualLineChart(dataset.koreaClimateSummary, 'month', 'normalRainfallMm', 'previousYearRainfallMm', { labelA: '평년 강수', labelB: '예년 강수', unit: 'mm', colorA: '#2f8edb', colorB: '#e2a229' }), "</div>\n            </article>\n          </section>\n          <article class=\"card pad\">\n            <div class=\"card-header\">\n              <div>\n                <h2>AWD \uC774\uD589\uC774 \uBD80\uC871\uD55C \uBD80\uC9C0</h2>\n                <p class=\"subtle mt-6\">AWD Score (for example)\uAC00 \uB0AE\uC740 \uBD80\uC9C0\uB97C \uC6B0\uC120 \uC810\uAC80 \uB300\uC0C1\uC73C\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.</p>\n              </div>\n              <a class=\"btn secondary small\" href=\"#/monitoring\">Monitoring \uC5F4\uAE30</a>\n            </div>\n            ").concat(renderFieldTable(deficient.length ? deficient : dataset.fields.slice(0, 5), { compact: true }), "\n          </article>\n        </div>\n        <aside class=\"card details-panel\">\n          <h2>\uBD80\uC9C0 \uAC80\uC0C9</h2>\n          <p class=\"subtle mt-6\">\uC9C0\uC5ED, \uC77C\uB828\uBC88\uD638, \uC704\uB3C4, \uACBD\uB3C4\uB85C \uAC80\uC0C9\uD569\uB2C8\uB2E4. \uACB0\uACFC \uC120\uD0DD \uC2DC Dashboard\uAC00 Search Result \uD615\uD0DC\uB85C \uC804\uD658\uB429\uB2C8\uB2E4.</p>\n          ").concat(renderFieldSearch('dashboard', 'Search field by region, serial, latitude, longitude'), "\n          <div class=\"callout info mt-18\">\n            <strong>Home \uC815\uBCF4</strong><br />\uC804\uCCB4 \uCD94\uC815 \uAC10\uCD95\uB7C9, \uC804\uCCB4 \uAD00\uB9AC \uBA74\uC801, AWD \uC810\uAC80 \uB300\uC0C1, \uD55C\uAD6D \uD3C9\uB144/\uC608\uB144 \uAE30\uD6C4 \uB370\uC774\uD130\uB97C \uC694\uC57D\uD569\uB2C8\uB2E4.\n          </div>\n          <div class=\"detail-list mt-18\">\n            ").concat(detailRow('CSV 위치 수', "".concat(formatNumber(summary.fieldCount), "\uAC1C")), "\n            ").concat(detailRow('전체 관리 면적', "".concat(formatNumber(summary.totalArea, 2), " ha")), "\n            ").concat(detailRow('전체 CH4 추정량', "".concat(formatNumber(summary.totalCh4, 2), " CSV units")), "\n            ").concat(detailRow('CO₂e 환산 예시', "".concat(formatNumber(summary.totalTco2e, 2), " tCO\u2082e")), "\n            ").concat(detailRow('점검 대상', "".concat(formatNumber(summary.riskCount), "\uAC1C")), "\n          </div>\n        </aside>\n      </section>\n    ");
    }
    function renderDashboardResult() {
        var _a;
        var field = getField();
        var predictions = getPredictions(field.parcelId);
        var climate = getClimate(field.parcelId);
        var sourceText = ((_a = climate[0]) === null || _a === void 0 ? void 0 : _a.source) || 'data/climate_observations.csv';
        return "\n      ".concat(renderFieldKpis(field), "\n      <section class=\"grid dashboard\">\n        <div class=\"grid\">\n          <article class=\"card pad\">\n            <div class=\"card-header\">\n              <div>\n                <h2>Satellite View \u00B7 Search Result</h2>\n                <p class=\"subtle mt-6\">").concat(field.region, " \u00B7 ").concat(field.parcelId, " \u00B7 100m \u00D7 50m footprint</p>\n              </div>\n              <div class=\"button-row no-print\">\n                <button class=\"btn secondary small\" data-action=\"dashboard-home\">Back to Home</button>\n                <button class=\"btn secondary small\" data-route-to=\"monitoring\">Open Monitoring</button>\n              </div>\n            </div>\n            <div class=\"satellite-frame\">").concat(renderSatelliteTileMap({ centerLat: field.lat, centerLon: field.lon, zoom: 16, markers: [field], mode: 'result', footprint: true }), "</div>\n            <p class=\"map-caption\">Source: ").concat(htmlEscape(DATA.sources.satellite.attribution), ". \uB178\uB780 \uC0AC\uAC01\uD615\uC740 CSV \uC704\uACBD\uB3C4 \uC911\uC2EC\uC758 100m \u00D7 50m \uAC00\uC0C1 \uBD80\uC9C0 \uBC94\uC704\uC785\uB2C8\uB2E4.</p>\n          </article>\n          <section class=\"grid two\">\n            <article class=\"card pad\">\n              <h3>CH\u2084 \uCD94\uC815\uB7C9 \uC2DC\uACC4\uC5F4</h3>\n              <p class=\"subtle mt-6\">\uC704\uCE58: <code>").concat(htmlEscape(field.dataSource), "</code> \u00B7 Key: \uC704\uB3C4|\uACBD\uB3C4|\uC2DC\uC791\uC2DC\uAC04|\uC885\uB8CC\uC2DC\uAC04</p>\n              <div class=\"chart-box\">").concat(lineChart(predictions, 'startTime', 'ch4Estimated', { color: '#0f8f59', area: true, unit: 'CSV units' }), "</div>\n            </article>\n            <article class=\"card pad\">\n              <h3>\uC9C0\uC5ED \uAE30\uD6C4 \uB370\uC774\uD130 \u00B7 Temperature / Rainfall</h3>\n              <p class=\"subtle mt-6\">\uC704\uCE58: <code>data/climate_observations.csv</code> \u00B7 \uCD9C\uCC98: ").concat(htmlEscape(sourceText), "</p>\n              <div class=\"chart-box\">").concat(dualLineChart(climate, 'startTime', 'temperatureC', 'rainfallMm', { labelA: 'Temperature', labelB: 'Rainfall', unit: '°C / mm', colorA: '#e2a229', colorB: '#2f8edb' }), "</div>\n            </article>\n          </section>\n          <article class=\"card pad\">\n            <h2>Search Result Summary</h2>\n            <p class=\"subtle mt-6\">\uC120\uD0DD \uBD80\uC9C0\uAC00 \uC704\uCE58\uD55C \uC9C0\uC5ED\uC758 \uAE30\uD6C4 \uB370\uC774\uD130, \uBA74\uC801, \uAC10\uCD95\uB7C9, AWD \uC774\uD589 \uC0C1\uD0DC\uB97C \uC694\uC57D\uD569\uB2C8\uB2E4.</p>\n            ").concat(renderFieldTable([field], { compact: false }), "\n          </article>\n        </div>\n        ").concat(renderFieldDetails(field), "\n      </section>\n    ");
    }
    function renderKpis(summary) {
        var kpis = [
            ['필지 수', "".concat(formatNumber(summary.fieldCount), "\uAC1C"), 'CSV 고유 위경도 수'],
            ['전체 관리 면적', "".concat(formatNumber(summary.totalArea, 2), "ha"), '각 부지 100m×50m 가정'],
            ['전체 CH₄ 추정량', "".concat(formatNumber(summary.totalCh4, 1)), 'CSV model output'],
            ['CO₂e 환산 예시', "".concat(formatNumber(summary.totalTco2e, 1), "t"), 'CH₄×28/1000 예시'],
            ['점검 대상', "".concat(formatNumber(summary.riskCount), "\uAC1C"), 'Watch/Risk 상태']
        ];
        return "<section class=\"kpi-grid\">".concat(kpis.map(function (_a) {
            var label = _a[0], value = _a[1], foot = _a[2];
            return "\n      <article class=\"kpi-card\"><div class=\"kpi-label\">".concat(label, "</div><div class=\"kpi-value\">").concat(value, "</div><div class=\"kpi-foot\">").concat(foot, "</div></article>");
        }).join(''), "</section>");
    }
    function renderFieldKpis(field) {
        var reductionRate = field.baselineTco2eExample ? field.estimatedReductionTco2e / field.baselineTco2eExample * 100 : 0;
        var kpis = [
            ['선택 부지', compactId(field.parcelId), field.region],
            ['부지 면적', "".concat(formatNumber(field.areaHa, 2), "ha"), '100m×50m footprint'],
            ['AWD Score', "".concat(field.awdScoreExample), '(for example)'],
            ['CH₄ 추정량', "".concat(formatNumber(field.totalCh4, 1)), 'CSV model output'],
            ['감축량 환산', "".concat(formatNumber(field.estimatedReductionTco2e, 2), "t"), "".concat(formatNumber(reductionRate, 1), "% of baseline example")]
        ];
        return "<section class=\"kpi-grid\">".concat(kpis.map(function (_a) {
            var label = _a[0], value = _a[1], foot = _a[2];
            return "\n      <article class=\"kpi-card\"><div class=\"kpi-label\">".concat(label, "</div><div class=\"kpi-value\">").concat(value, "</div><div class=\"kpi-foot\">").concat(foot, "</div></article>");
        }).join(''), "</section>");
    }
    function renderFieldDetails(field) {
        var reductionPct = field.baselineTco2eExample ? Math.round((field.estimatedReductionTco2e / field.baselineTco2eExample) * 100) : 0;
        return "\n      <aside class=\"card details-panel\">\n        <div class=\"card-header\">\n          <div><h2>Field Details</h2><p class=\"subtle mt-6\">".concat(field.region, " \u00B7 ").concat(field.farmerCode, "</p></div>\n          ").concat(statusBadge(field.status), "\n        </div>\n        <div class=\"detail-list\">\n          ").concat(detailRow('Field ID', field.parcelId), "\n          ").concat(detailRow('Serial', field.serial), "\n          ").concat(detailRow('Area', "".concat(formatNumber(field.areaHa, 2), " ha")), "\n          ").concat(detailRow('AWD Score', "".concat(field.awdScoreExample, " / 100 ")), "\n          ").concat(detailRow('Tag', 'AWD Score (for example)'), "\n          ").concat(detailRow('Latitude', "".concat(formatNumber(field.lat, 6), "\u00B0 N")), "\n          ").concat(detailRow('Longitude', "".concat(formatNumber(field.lon, 6), "\u00B0 E")), "\n          ").concat(detailRow('Observations', "".concat(formatNumber(field.observationCount), " rows")), "\n          ").concat(detailRow('Mean CH₄', "".concat(formatNumber(field.meanCh4, 2), " CSV units")), "\n          ").concat(detailRow('Total CH₄', "".concat(formatNumber(field.totalCh4, 2), " CSV units")), "\n          ").concat(detailRow('CO₂e Proxy', "".concat(formatNumber(field.estimatedReductionTco2e, 2), " tCO\u2082e")), "\n          ").concat(detailRow('Reduction Rate', "".concat(reductionPct, "% of baseline example")), "\n          ").concat(detailRow('Climate Data', field.climateSource), "\n          ").concat(detailRow('Last Update', field.lastUpdate), "\n        </div>\n        <div class=\"button-row mt-18 no-print\">\n          <button class=\"btn\" data-route-to=\"monitoring\">Load Monitoring</button>\n          <button class=\"btn secondary\" data-download-field=\"").concat(field.parcelId, "\">Export Field JSON</button>\n        </div>\n        <p class=\"subtle mt-14\">* AI\uB294 \uACF5\uC2DD \uC778\uC99D\uC744 \uB300\uCCB4\uD558\uC9C0 \uC54A\uACE0, MRV \uC790\uB8CC \uC0DD\uC131\uACFC \uAC80\uC99D \uBE44\uC6A9 \uC808\uAC10\uC744 \uC9C0\uC6D0\uD558\uB294 \uBCF4\uC870 \uB3C4\uAD6C\uC785\uB2C8\uB2E4.</p>\n      </aside>\n    ");
    }
    function detailRow(label, value) {
        return "<div class=\"detail-row\"><span>".concat(label, "</span><strong>").concat(htmlEscape(value), "</strong></div>");
    }
    function renderLegend() {
        return "<div class=\"legend\">\n      ".concat(Object.entries(statusMeta).map(function (_a) {
            var meta = _a[1];
            return "<span class=\"legend-item\"><i class=\"legend-dot\" style=\"background:".concat(meta.color, "\"></i>").concat(meta.label, "</span>");
        }).join(''), "\n    </div>");
    }
    function renderDataProcessing() {
        var summary = getSummary();
        var filtered = filterFields(state.dataSearch);
        return "\n      <section class=\"grid two\">\n        <article class=\"card pad\">\n          <div class=\"card-header\">\n            <div>\n              <h2>CH\u2084 Prediction CSV Upload</h2>\n              <p class=\"subtle mt-6\">\uAE30\uC874 Parcels \uD328\uB110\uC744 Data Processing \uD328\uB110\uB85C \uBCC0\uACBD\uD588\uC2B5\uB2C8\uB2E4. \uC11C\uBC84 \uC800\uC7A5 \uC5C6\uC774 \uBE0C\uB77C\uC6B0\uC800 localStorage\uC5D0\uB9CC \uBC18\uC601\uB429\uB2C8\uB2E4.</p>\n            </div>\n            <span class=\"tag\">Key: \uC704\uB3C4\u00B7\uACBD\uB3C4\u00B7\uC2DC\uAC04</span>\n          </div>\n          <div class=\"upload-box\">\n            <label class=\"field\">\n              <span class=\"label\">ch4_predictions.csv\uC640 \uAC19\uC740 \uAD6C\uC870\uC758 CSV \uC5C5\uB85C\uB4DC</span>\n              <input class=\"file-input\" id=\"ch4CsvInput\" type=\"file\" accept=\".csv,text/csv\" />\n            </label>\n            <div class=\"schema-grid\">\n              ".concat(DATA.csvSchema.map(function (col) { return "<div class=\"schema-cell\"><strong>".concat(htmlEscape(col), "</strong><span class=\"subtle\">required</span></div>"); }).join(''), "\n            </div>\n            <div class=\"callout warning\">\n              \uC911\uBCF5 Key\uB294 <code>\uC704\uB3C4|\uACBD\uB3C4|\uC2DC\uC791\uC2DC\uAC04|\uC885\uB8CC\uC2DC\uAC04</code>\uC785\uB2C8\uB2E4. \uC911\uBCF5\uC774 \uBC1C\uACAC\uB418\uBA74 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uC911\uBCF5 \uAC1C\uC218\uC640 \uCC98\uB9AC \uBC29\uC2DD\uC744 \uBB3B\uB294 \uBA54\uC2DC\uC9C0\uCC3D\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4.\n            </div>\n            <div class=\"button-row\">\n              <button class=\"btn secondary\" data-action=\"download-normalized-csv\">Normalized CSV \uB2E4\uC6B4\uB85C\uB4DC</button>\n              <button class=\"btn secondary\" data-action=\"download-climate-csv\">Climate CSV \uB2E4\uC6B4\uB85C\uB4DC</button>\n              <button class=\"btn danger\" data-action=\"clear-uploaded-csv\">\uC5C5\uB85C\uB4DC \uB370\uC774\uD130 \uCD08\uAE30\uD654</button>\n            </div>\n          </div>\n        </article>\n        <aside class=\"card details-panel\">\n          <h2>Current Dataset</h2>\n          <p class=\"subtle mt-6\">\uD544\uC9C0 \uC218\uB294 CSV\uC758 \uACE0\uC720 \uC704\uACBD\uB3C4 \uC704\uCE58 \uC218\uB85C \uACC4\uC0B0\uB429\uB2C8\uB2E4.</p>\n          <div class=\"detail-list mt-14\">\n            ").concat(detailRow('Data source', dataset.dataSourceLabel), "\n            ").concat(detailRow('Prediction rows', "".concat(formatNumber(summary.rows), " rows")), "\n            ").concat(detailRow('Unique locations', "".concat(formatNumber(summary.fieldCount), " fields")), "\n            ").concat(detailRow('Total area', "".concat(formatNumber(summary.totalArea, 2), " ha")), "\n            ").concat(detailRow('Total CH₄', "".concat(formatNumber(summary.totalCh4, 2), " CSV units")), "\n            ").concat(detailRow('CO₂e proxy', "".concat(formatNumber(summary.totalTco2e, 2), " tCO\u2082e")), "\n          </div>\n          <div class=\"callout info mt-18\">\n            <strong>\uAE30\uD6C4 \uB370\uC774\uD130 \uD30C\uC77C</strong><br />\uB370\uBAA8\uC6A9 CSV: <code>data/climate_observations.csv</code><br />\uC2E4\uC81C \uC804\uD658 \uB300\uC0C1: Copernicus ERA5 single-levels \uB610\uB294 \uAE30\uC0C1\uCCAD ASOS/AWS.\n          </div>\n        </aside>\n      </section>\n      <article class=\"card pad\">\n        <div class=\"card-header\">\n          <div>\n            <h2>Processed Fields</h2>\n            <p class=\"subtle mt-6\">\uAC80\uC0C9\uC740 \uC704\uACBD\uB3C4, \uC9C0\uC5ED, \uC77C\uB828\uBC88\uD638\uB85C \uAC00\uB2A5\uD569\uB2C8\uB2E4.</p>\n          </div>\n          <label class=\"field\" style=\"max-width:360px;\">\n            <span class=\"label\">Search</span>\n            <input type=\"search\" data-input=\"data-search\" value=\"").concat(htmlEscape(state.dataSearch), "\" placeholder=\"FIELD-001, 34.75, \uC804\uBD81, 003\" />\n          </label>\n        </div>\n        ").concat(renderFieldTable(filtered), "\n      </article>\n      <article class=\"card pad\">\n        <h2>Raw Prediction Preview</h2>\n        <p class=\"subtle mt-6\">\uCC98\uC74C 20\uAC1C \uD589\uB9CC \uD45C\uC2DC\uD569\uB2C8\uB2E4.</p>\n        <div class=\"data-preview\">").concat(renderPredictionPreview(dataset.predictions.slice(0, 20)), "</div>\n      </article>\n    ");
    }
    function renderPredictionPreview(rows) {
        return "<div class=\"table-wrap\"><table><thead><tr><th>Field</th><th>\uC704\uB3C4</th><th>\uACBD\uB3C4</th><th>\uC2DC\uC791\uC2DC\uAC04</th><th>\uC885\uB8CC\uC2DC\uAC04</th><th>CH\u2084_\uCD94\uC815\uB7C9</th><th>Key</th></tr></thead><tbody>\n      ".concat(rows.map(function (row) { return "<tr><td>".concat(row.parcelId, "</td><td>").concat(formatNumber(row.lat, 5), "</td><td>").concat(formatNumber(row.lon, 5), "</td><td>").concat(row.startTime, "</td><td>").concat(row.endTime, "</td><td>").concat(formatNumber(row.ch4Estimated, 4), "</td><td><code>").concat(htmlEscape(row.key), "</code></td></tr>"); }).join(''), "\n    </tbody></table></div>");
    }
    function renderMonitoring() {
        var _a, _b;
        var field = getField();
        var predictions = getPredictions(field.parcelId);
        var climate = getClimate(field.parcelId);
        return "\n      <section class=\"grid monitoring-layout\">\n        <aside class=\"card details-panel\">\n          <h2>Field Search</h2>\n          <p class=\"subtle mt-6\">\uC218\uCC9C \uAC1C \uD544\uC9C0\uB97C \uB300\uBE44\uD574 \uB4DC\uB86D\uB2E4\uC6B4 \uB300\uC2E0 \uAC80\uC0C9\uD615 \uC120\uD0DD UI\uB97C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.</p>\n          ".concat(renderFieldSearch('monitoring', '위경도, 지역, 일련번호로 검색'), "\n          <div class=\"callout info mt-18\">\n            <strong>\uAC80\uC0C9 \uAC00\uB2A5 Key</strong><br />\uC704\uB3C4, \uACBD\uB3C4, \uC9C0\uC5ED\uBA85, \uC77C\uB828\uBC88\uD638, Field ID\n          </div>\n        </aside>\n        <div class=\"grid\">\n          ").concat(renderFieldKpis(field), "\n          <section class=\"grid two\">\n            <article class=\"card pad\">\n              <h3>CH\u2084 \uCD94\uC815\uB7C9</h3>\n              <p class=\"subtle mt-6\">\uC704\uCE58: <code>").concat(htmlEscape(field.dataSource), "</code></p>\n              <div class=\"chart-box\">").concat(lineChart(predictions, 'startTime', 'ch4Estimated', { color: '#0f8f59', area: true, unit: 'CSV units' }), "</div>\n            </article>\n            <article class=\"card pad\">\n              <h3>NDWI Proxy \u00B7 \uCE68\uC218/\uAC74\uC870 \uD310\uB2E8 \uBCF4\uC870</h3>\n              <p class=\"subtle mt-6\">\uC704\uC131 \uC218\uBD84\uC9C0\uC218 \uAE30\uBC18 \uC608\uC2DC. \uC2E4\uC81C \uC11C\uBE44\uC2A4\uC5D0\uC11C\uB294 Sentinel-1/2, Landsat, \uD604\uC7A5\uC790\uB8CC\uB85C \uBCF4\uC815\uD569\uB2C8\uB2E4.</p>\n              <div class=\"chart-box\">").concat(lineChart(predictions, 'startTime', 'ndwiProxy', { color: '#2f8edb', area: true, unit: 'NDWI proxy' }), "</div>\n            </article>\n          </section>\n          <section class=\"grid two\">\n            <article class=\"card pad\">\n              <h3>Temperature</h3>\n              <p class=\"subtle mt-6\">\uC704\uCE58: <code>data/climate_observations.csv</code> \u00B7 \uCD9C\uCC98: ").concat(htmlEscape(((_a = climate[0]) === null || _a === void 0 ? void 0 : _a.source) || ''), "</p>\n              <div class=\"chart-box\">").concat(dualLineChart(climate, 'startTime', 'temperatureC', 'normalTemperatureC', { labelA: '관측/데모', labelB: '평년', unit: '°C', colorA: '#e2a229', colorB: '#0f8f59' }), "</div>\n            </article>\n            <article class=\"card pad\">\n              <h3>Rainfall</h3>\n              <p class=\"subtle mt-6\">\uC704\uCE58: <code>data/climate_observations.csv</code> \u00B7 \uCD9C\uCC98: ").concat(htmlEscape(((_b = climate[0]) === null || _b === void 0 ? void 0 : _b.source) || ''), "</p>\n              <div class=\"chart-box\">").concat(dualLineChart(climate, 'startTime', 'rainfallMm', 'normalRainfallMm', { labelA: '관측/데모', labelB: '평년', unit: 'mm', colorA: '#2f8edb', colorB: '#0f8f59' }), "</div>\n            </article>\n          </section>\n          <article class=\"card pad\">\n            <div class=\"card-header\">\n              <div>\n                <h2>Flood / Dry Timeline</h2>\n                <p class=\"subtle mt-6\">NDWI proxy \uAE30\uC900\uC758 \uC2DC\uAC01\uD654 \uC608\uC2DC\uC785\uB2C8\uB2E4.</p>\n              </div>\n              ").concat(statusBadge(field.status), "\n            </div>\n            ").concat(renderTimeline(predictions), "\n          </article>\n        </div>\n      </section>\n    ");
    }
    function renderTimeline(rows) {
        return "<div class=\"timeline\">".concat(rows.map(function (row) {
            var cls = row.waterStatusProxy === 'DRY' ? 'dry' : (row.waterStatusProxy === 'TRANSITION' ? 'transition' : 'flooded');
            return "<div class=\"timeline-cell ".concat(cls, "\" title=\"").concat(row.startTime, " \u00B7 ").concat(row.waterStatusProxy, " \u00B7 NDWI ").concat(row.ndwiProxy, "\"></div>");
        }).join(''), "</div>\n    <div class=\"legend mt-14\"><span class=\"legend-item\"><i class=\"legend-dot\" style=\"background:#f1c65c\"></i>Dry</span><span class=\"legend-item\"><i class=\"legend-dot\" style=\"background:#89c7a8\"></i>Transition</span><span class=\"legend-item\"><i class=\"legend-dot\" style=\"background:#4da3d9\"></i>Flooded</span></div>");
    }
    function renderEvidence() {
        var field = getField();
        var evidence = getEvidence(field.parcelId);
        return "\n      <section class=\"grid monitoring-layout\">\n        <aside class=\"card details-panel\">\n          <h2>Field Search</h2>\n          <p class=\"subtle mt-6\">\uC704\uACBD\uB3C4, \uC9C0\uC5ED, \uC77C\uB828\uBC88\uD638\uB85C \uAC80\uC0C9\uD558\uC5EC \uC99D\uBE59 \uB370\uC774\uD130\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.</p>\n          ".concat(renderFieldSearch('evidence', '위경도, 지역, 일련번호로 검색'), "\n          <div class=\"callout warning mt-18\">GitHub Pages\uC5D0\uB294 \uC2E4\uC81C \uD30C\uC77C \uC5C5\uB85C\uB4DC/\uC800\uC7A5 \uAE30\uB2A5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0AC\uC9C4\u00B7\uACC4\uC57D\uC11C\u00B7\uBBFC\uAC10 \uC88C\uD45C\uB294 \uCEE4\uBC0B\uD558\uC9C0 \uB9C8\uC138\uC694.</div>\n        </aside>\n        <div class=\"grid\">\n          <article class=\"card pad\">\n            <div class=\"card-header\">\n              <div>\n                <h2>Evidence Data Room</h2>\n                <p class=\"subtle mt-6\">").concat(field.region, " \u00B7 ").concat(field.parcelId, "</p>\n              </div>\n              ").concat(statusBadge(field.status), "\n            </div>\n            <div class=\"evidence-grid\">\n              ").concat(evidence.map(function (row) {
            var meta = evidenceMeta[row.evidenceType] || { label: row.evidenceType, icon: '•' };
            return "<article class=\"evidence-card\">\n                  <div style=\"font-size:27px;\">".concat(meta.icon, "</div>\n                  <h3>").concat(meta.label, "</h3>\n                  ").concat(evidenceBadge(row.status), "\n                  <p class=\"subtle\"><strong>Source:</strong> ").concat(htmlEscape(row.source), "</p>\n                  <p class=\"tiny\">Date: ").concat(htmlEscape(row.date), " \u00B7 Confidence: ").concat(htmlEscape(row.confidence), "</p>\n                </article>");
        }).join(''), "\n            </div>\n          </article>\n          <article class=\"card pad\">\n            <h2>Evidence Table</h2>\n            <div class=\"table-wrap\"><table><thead><tr><th>Type</th><th>Status</th><th>Source</th><th>Date</th><th>Confidence</th></tr></thead><tbody>\n              ").concat(evidence.map(function (row) { var _a; return "<tr><td>".concat(htmlEscape(((_a = evidenceMeta[row.evidenceType]) === null || _a === void 0 ? void 0 : _a.label) || row.evidenceType), "</td><td>").concat(evidenceBadge(row.status), "</td><td>").concat(htmlEscape(row.source), "</td><td>").concat(row.date, "</td><td>").concat(row.confidence, "</td></tr>"); }).join(''), "\n            </tbody></table></div>\n          </article>\n        </div>\n      </section>\n    ");
    }
    function renderBuyerReport() {
        var lot = dataset.buyerLots.find(function (item) { return item.lotId === state.selectedLotId; }) || dataset.buyerLots[0];
        var lotFields = dataset.fields.filter(function (field) { return lot.parcelIds.includes(field.parcelId); });
        var totalArea = lotFields.reduce(function (sum, field) { return sum + field.areaHa; }, 0);
        var totalCh4 = lotFields.reduce(function (sum, field) { return sum + field.totalCh4; }, 0);
        var totalTco2e = lotFields.reduce(function (sum, field) { return sum + field.estimatedReductionTco2e; }, 0);
        return "\n      <section class=\"grid report-layout\">\n        <article class=\"report-paper\" id=\"reportPaper\">\n          <div class=\"report-header\">\n            <div>\n              <p class=\"eyebrow\">Buyer Report \u00B7 Mock-Up</p>\n              <h2>\uBC14\uC774\uC5B4 \uB9AC\uD3EC\uD2B8(Mock-Up)</h2>\n              <p class=\"subtle mt-6\">Low-Carbon Rice AWD Evidence Report</p>\n            </div>\n            <img src=\"assets/images/agri-i-logo.jpg\" alt=\"Agri-I logo\" style=\"width:120px;height:64px;object-fit:cover;border-radius:14px;\" />\n          </div>\n          <section class=\"grid two\">\n            ".concat(miniMetric(lot.lotId, 'Lot ID'), "\n            ").concat(miniMetric("".concat(formatNumber(lotFields.length), "\uAC1C"), '참여 부지'), "\n            ").concat(miniMetric("".concat(formatNumber(totalArea, 2), "ha"), '관리 면적'), "\n            ").concat(miniMetric("".concat(formatNumber(totalTco2e, 2), "t"), 'CO₂e 환산 예시'), "\n          </section>\n          <div class=\"callout warning mt-18\">\n            \uC774 \uB9AC\uD3EC\uD2B8\uB294 \uD5A5\uD6C4 \uBC14\uC774\uC5B4 \uC81C\uCD9C\uC6A9 \uCD9C\uB825\uBB3C\uC758 <strong>Mock-Up</strong>\uC785\uB2C8\uB2E4. \uACF5\uC2DD \uC778\uC99D\uC11C \uB610\uB294 \uD0C4\uC18C\uD06C\uB808\uB527 \uBC1C\uD589 \uBB38\uC11C\uAC00 \uC544\uB2D9\uB2C8\uB2E4.\n          </div>\n          <h3 class=\"mt-18\">Field Summary</h3>\n          ").concat(renderFieldTable(lotFields, { compact: true }), "\n          <h3 class=\"mt-18\">Evidence Checklist</h3>\n          <div class=\"evidence-grid\">\n            ").concat(['SATELLITE_OBSERVATION', 'WEATHER_SERIES', 'FARMER_ACTIVITY_LOG', 'POLYGON_BOUNDARY'].map(function (type) {
            var rows = dataset.evidence.filter(function (row) { return lot.parcelIds.includes(row.parcelId) && row.evidenceType === type; });
            var collected = rows.filter(function (row) { return row.status !== 'MISSING'; }).length;
            var meta = evidenceMeta[type];
            return "<article class=\"evidence-card\"><h3>".concat(meta.icon, " ").concat(meta.label, "</h3><strong>").concat(collected, "/").concat(rows.length, "</strong><p class=\"subtle\">lot \uB2E8\uC704 \uC99D\uBE59 \uC218\uC9D1 \uC0C1\uD0DC</p></article>");
        }).join(''), "\n          </div>\n          <p class=\"tiny mt-18\">Source: CH4 prediction CSV (<code>").concat(htmlEscape(dataset.dataSourceLabel), "</code>), climate CSV (<code>data/climate_observations.csv</code>), Sentinel-2 Cloudless satellite view.</p>\n        </article>\n        <aside class=\"card details-panel no-print\">\n          <h2>Report Actions</h2>\n          <p class=\"subtle mt-6\">\uBE0C\uB77C\uC6B0\uC800 \uC778\uC1C4 \uAE30\uB2A5\uC73C\uB85C PDF \uC800\uC7A5\uC774 \uAC00\uB2A5\uD569\uB2C8\uB2E4.</p>\n          <div class=\"button-row mt-14\">\n            <button class=\"btn\" data-action=\"print-report\">PDF\uB85C \uC800\uC7A5/\uC778\uC1C4</button>\n            <button class=\"btn secondary\" data-action=\"download-report-json\">Report JSON</button>\n          </div>\n          <div class=\"detail-list mt-18\">\n            ").concat(detailRow('Lot name', lot.name), "\n            ").concat(detailRow('Volume', "".concat(formatNumber(lot.volumeTon, 1), " ton")), "\n            ").concat(detailRow('Total CH₄', "".concat(formatNumber(totalCh4, 2), " CSV units")), "\n            ").concat(detailRow('Report status', lot.reportStatus), "\n          </div>\n        </aside>\n      </section>\n    ");
    }
    function renderPassport() {
        var field = getField();
        return "\n      <article class=\"card passport-card\">\n        <div class=\"passport-hero\">\n          <p class=\"eyebrow\" style=\"color:#c8f6d6;\">Product Passport \u00B7 Mock-Up</p>\n          <h2>Agri-I \uC800\uD0C4\uC18C AWD \uC300</h2>\n          <p>QR \uAE30\uBC18 \uC0DD\uC0B0 \uC774\uB825\u00B7\uC800\uD0C4\uC18C \uC2A4\uD1A0\uB9AC \uD655\uC778 \uD654\uBA74 \uC608\uC2DC\uC785\uB2C8\uB2E4.</p>\n        </div>\n        <div class=\"passport-body\">\n          <div class=\"button-row\" style=\"justify-content:space-between;align-items:flex-start;\">\n            <div>\n              <h3>".concat(field.region, "</h3>\n              <p class=\"subtle\">").concat(field.parcelId, " \u00B7 ").concat(formatNumber(field.lat, 5), ", ").concat(formatNumber(field.lon, 5), "</p>\n            </div>\n            <div class=\"qr-box\" aria-label=\"QR mockup\"></div>\n          </div>\n          <div class=\"detail-list mt-18\">\n            ").concat(detailRow('AWD Score', "".concat(field.awdScoreExample, " / 100 (for example)")), "\n            ").concat(detailRow('면적', "".concat(formatNumber(field.areaHa, 2), " ha")), "\n            ").concat(detailRow('CH₄ 추정량', "".concat(formatNumber(field.totalCh4, 2), " CSV units")), "\n            ").concat(detailRow('CO₂e 환산 예시', "".concat(formatNumber(field.estimatedReductionTco2e, 2), " tCO\u2082e")), "\n            ").concat(detailRow('증빙 완료율', "".concat(field.evidenceRate, "%")), "\n          </div>\n          <div class=\"callout warning mt-18\">\uD604\uC7AC \uD654\uBA74\uC740 \uC81C\uD488 \uD328\uC2A4\uD3EC\uD2B8(Mock-Up)\uC785\uB2C8\uB2E4. \uC778\uC99D \uC644\uB8CC \uD45C\uC2DC\uAC00 \uC544\uB2C8\uB77C \uD5A5\uD6C4 \uC81C\uD488 \uB2E8\uC704 \uC2E0\uB8B0 \uC815\uBCF4 \uC608\uC2DC\uC785\uB2C8\uB2E4.</div>\n        </div>\n      </article>\n    ");
    }
    function renderMethodology() {
        return "\n      <section class=\"grid two\">\n        <article class=\"card pad\">\n          <h2>AWD Score (for example) \uC0B0\uC815 \uBC29\uC2DD</h2>\n          <p class=\"subtle mt-10\">\uC5C5\uB85C\uB4DC CSV\uC5D0\uB294 AWD \uC774\uD589 \uC810\uC218\uAC00 \uC9C1\uC811 \uB4E4\uC5B4\uC788\uC9C0 \uC54A\uAE30 \uB54C\uBB38\uC5D0, \uD604\uC7AC \uC6F9\uC571\uC758 AWD Score\uB294 \uBC1C\uD45C\uC6A9 \uC0C1\uB300\uC9C0\uD45C\uC785\uB2C8\uB2E4.</p>\n          <div class=\"callout warning mt-14\">\n            <strong>\uACF5\uC2DD \uC810\uC218 \uC544\uB2D8</strong><br />\uAC01 \uC704\uCE58\uC758 \uD3C9\uADE0 <code>CH4_\uCD94\uC815\uB7C9</code>\uC744 \uC804\uCCB4 \uC704\uCE58 \uD3C9\uADE0 \uBC94\uC704 \uC548\uC5D0\uC11C \uC815\uADDC\uD654\uD574 55~90\uC810\uC73C\uB85C \uB9E4\uD551\uD569\uB2C8\uB2E4. \uD3C9\uADE0 CH\u2084 \uCD94\uC815\uB7C9\uC774 \uB0AE\uC740 \uBD80\uC9C0\uB294 \uC810\uC218\uAC00 \uB192\uACE0, \uB192\uC740 \uBD80\uC9C0\uB294 Watch/Risk\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.\n          </div>\n          <pre class=\"callout mt-14\" style=\"white-space:pre-wrap;\"><code>score = 55 + 35 \u00D7 (maxMeanCH4 - fieldMeanCH4) / (maxMeanCH4 - minMeanCH4)\nstatus = score \u2265 75: On Track, 60~74: Watch, &lt;60: Risk</code></pre>\n          <p class=\"subtle mt-10\">\uC2E4\uC81C \uC11C\uBE44\uC2A4\uC5D0\uC11C\uB294 Sentinel-1/2, Landsat, ERA5, \uAE30\uC0C1\uCCAD AWS, \uD604\uC7A5 \uBB3C\uAD00\uB9AC \uAE30\uB85D\uC744 \uD568\uAED8 \uC0AC\uC6A9\uD574 AWD \uC774\uD589 \uC5EC\uBD80\uB97C \uAC80\uC99D\uD574\uC57C \uD569\uB2C8\uB2E4.</p>\n        </article>\n        <article class=\"card pad\">\n          <h2>Satellite & Climate Data</h2>\n          <div class=\"detail-list mt-14\">\n            ".concat(detailRow('Satellite current mode', DATA.sources.satellite.mode), "\n            ").concat(detailRow('Satellite tile', 'EOX Sentinel-2 Cloudless 2024'), "\n            ").concat(detailRow('Climate CSV', 'data/climate_observations.csv'), "\n            ").concat(detailRow('Korea climate CSV', 'data/korea_climate_summary.csv'), "\n            ").concat(detailRow('GEE optional', GEE_CONFIG.enabled ? 'enabled' : 'disabled'), "\n          </div>\n          <div class=\"callout info mt-18\">\n            GitHub Pages\uC5D0\uC11C \uBE44\uC6A9 \uC5C6\uC774 \uB3D9\uC791\uD558\uB3C4\uB85D \uD604\uC7AC \uAD6C\uD604\uC740 API Key\uAC00 \uD544\uC694 \uC5C6\uB294 Sentinel-2 Cloudless tile layer\uB97C \uC0AC\uC6A9\uD569\uB2C8\uB2E4. GEE \uC2E4\uC2DC\uAC04 \uD0C0\uC77C\uB85C \uC804\uD658\uD558\uB824\uBA74 Google Cloud Project\uC640 Earth Engine OAuth \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.\n          </div>\n        </article>\n      </section>\n      <article class=\"card pad\">\n        <h2>dMRV \uCC98\uB9AC \uD750\uB984</h2>\n        <div class=\"grid four mt-14\">\n          ").concat(featureCard('1. CSV 수집', '위도·경도·시간·CH4 추정량 업로드', '1'), "\n          ").concat(featureCard('2. 중복 처리', '동일 Key 중복을 관리자 선택으로 처리', '2'), "\n          ").concat(featureCard('3. 필지 집계', '고유 위경도별 부지/감축량/KPI 생성', '3'), "\n          ").concat(featureCard('4. 증빙 연결', '위성·기후·활동기록·경계 데이터룸 표시', '4'), "\n        </div>\n      </article>\n    ");
    }
    function renderGuide() {
        return "\n      <section class=\"grid two\">\n        <article class=\"card pad\">\n          <h2>GitHub Pages \uBC30\uD3EC</h2>\n          <pre class=\"callout mt-14\" style=\"white-space:pre-wrap;\"><code>git init\ngit add .\ngit commit -m \"Update Agri-I feedback build\"\ngit branch -M main\ngit remote add origin https://github.com/&lt;YOUR_ACCOUNT&gt;/&lt;YOUR_REPO&gt;.git\ngit push -u origin main</code></pre>\n          <p class=\"subtle mt-10\">Settings \u2192 Pages \u2192 Source\uB97C GitHub Actions \uB610\uB294 main/root\uB85C \uC9C0\uC815\uD558\uBA74 \uB429\uB2C8\uB2E4.</p>\n        </article>\n        <article class=\"card pad\">\n          <h2>Data Files</h2>\n          <div class=\"detail-list mt-14\">\n            ".concat(detailRow('CH4 CSV', 'data/ch4_predictions.csv'), "\n            ").concat(detailRow('Climate CSV', 'data/climate_observations.csv'), "\n            ").concat(detailRow('Korea Climate CSV', 'data/korea_climate_summary.csv'), "\n            ").concat(detailRow('Static data bundle', 'assets/js/data.js'), "\n            ").concat(detailRow('Logo', 'assets/images/agri-i-logo.jpg / agri-i-logo-square.jpg'), "\n          </div>\n          <div class=\"callout warning mt-18\">\uC2E4\uC81C \uB18D\uAC00 \uAC1C\uC778\uC815\uBCF4, \uC5F0\uB77D\uCC98, \uACC4\uC57D\uC815\uBCF4, \uC6D0\uBCF8 \uBBFC\uAC10 \uC88C\uD45C, API Key, .env \uD30C\uC77C\uC740 public repository\uC5D0 \uCEE4\uBC0B\uD558\uC9C0 \uB9C8\uC138\uC694.</div>\n        </article>\n      </section>\n    ");
    }
    function renderFieldSearch(context, placeholder) {
        var q = state.fieldSearch[context] || '';
        var results = filterFields(q).slice(0, 12);
        return "<div class=\"search-panel mt-14\">\n      <input type=\"search\" data-field-search=\"".concat(context, "\" value=\"").concat(htmlEscape(q), "\" placeholder=\"").concat(htmlEscape(placeholder), "\" />\n      <div class=\"search-results\">\n        ").concat(results.map(function (field) { return "<div class=\"search-item ".concat(field.parcelId === state.selectedFieldId ? 'active' : '', "\" data-select-field=\"").concat(field.parcelId, "\" data-context=\"").concat(context, "\">\n          <strong>").concat(compactId(field.parcelId), " ").concat(statusBadge(field.status), "</strong>\n          <span>").concat(field.region, " \u00B7 ").concat(formatNumber(field.lat, 5), ", ").concat(formatNumber(field.lon, 5), " \u00B7 serial ").concat(field.serial, "</span>\n          <span>CH\u2084 ").concat(formatNumber(field.totalCh4, 1), " \u00B7 AWD Score ").concat(field.awdScoreExample, " <em>(for example)</em></span>\n        </div>"); }).join(''), "\n      </div>\n    </div>");
    }
    function renderFieldTable(fields, options) {
        if (options === void 0) { options = {}; }
        var rows = fields.length ? fields : [];
        if (!rows.length)
            return '<p class="subtle">표시할 부지가 없습니다.</p>';
        var compact = Boolean(options.compact);
        return "<div class=\"table-wrap\"><table><thead><tr>\n      <th>Field</th><th>Region</th><th>Lat/Lon</th><th>Area</th><th>AWD Score</th><th>CH\u2084</th><th>CO\u2082e</th><th>Status</th>".concat(compact ? '' : '<th>Rows</th>', "\n    </tr></thead><tbody>\n      ").concat(rows.map(function (field) { return "<tr class=\"clickable\" data-select-field=\"".concat(field.parcelId, "\" data-context=\"table\">\n        <td><strong>").concat(htmlEscape(field.parcelId), "</strong><br><span class=\"tiny\">serial ").concat(field.serial, "</span></td>\n        <td>").concat(htmlEscape(field.region), "</td>\n        <td>").concat(formatNumber(field.lat, 5), ", ").concat(formatNumber(field.lon, 5), "</td>\n        <td>").concat(formatNumber(field.areaHa, 2), "ha</td>\n        <td><strong>").concat(field.awdScoreExample, "</strong> <span class=\"tag\">for example</span></td>\n        <td>").concat(formatNumber(field.totalCh4, 1), "</td>\n        <td>").concat(formatNumber(field.estimatedReductionTco2e, 2), "t</td>\n        <td>").concat(statusBadge(field.status), "</td>\n        ").concat(compact ? '' : "<td>".concat(formatNumber(field.observationCount), "</td>"), "\n      </tr>"); }).join(''), "\n    </tbody></table></div>");
    }
    function renderSatelliteTileMap(_a) {
        var centerLat = _a.centerLat, centerLon = _a.centerLon, zoom = _a.zoom, _b = _a.markers, markers = _b === void 0 ? [] : _b, _c = _a.mode, mode = _c === void 0 ? 'home' : _c, _d = _a.footprint, footprint = _d === void 0 ? false : _d;
        var center = lonLatToPixels(centerLon, centerLat, zoom);
        var tileX = Math.floor(center.x / 256);
        var tileY = Math.floor(center.y / 256);
        var tileRadiusX = mode === 'home' ? 3 : 2;
        var tileRadiusY = mode === 'home' ? 2 : 2;
        var n = Math.pow(2, zoom);
        var tiles = '';
        for (var x = tileX - tileRadiusX; x <= tileX + tileRadiusX; x += 1) {
            for (var y = tileY - tileRadiusY; y <= tileY + tileRadiusY; y += 1) {
                if (y < 0 || y >= n)
                    continue;
                var wrappedX = ((x % n) + n) % n;
                var left = x * 256 - center.x;
                var top_1 = y * 256 - center.y;
                var src = DATA.sources.satellite.tileTemplate.replace('{z}', zoom).replace('{x}', wrappedX).replace('{y}', y);
                tiles += "<img class=\"tile-img\" alt=\"\" src=\"".concat(src, "\" loading=\"lazy\" style=\"left:calc(50% + ").concat(left.toFixed(2), "px);top:calc(50% + ").concat(top_1.toFixed(2), "px);\" />");
            }
        }
        var markerHtml = markers.map(function (field) {
            var point = lonLatToPixels(field.lon, field.lat, zoom);
            var dx = point.x - center.x;
            var dy = point.y - center.y;
            var meta = statusMeta[field.status] || statusMeta.MISSING;
            return "<button class=\"map-marker ".concat(meta.marker, "\" data-select-field=\"").concat(field.parcelId, "\" data-context=\"map\" data-label=\"").concat(compactId(field.parcelId), " \u00B7 ").concat(htmlEscape(field.region), "\" style=\"left:calc(50% + ").concat(dx.toFixed(2), "px);top:calc(50% + ").concat(dy.toFixed(2), "px);\" aria-label=\"").concat(field.parcelId, "\"></button>");
        }).join('');
        var footprintHtml = '';
        if (footprint) {
            var mpp = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / (Math.pow(2, zoom));
            var widthPx = clamp(100 / mpp, 24, 320);
            var heightPx = clamp(50 / mpp, 14, 220);
            footprintHtml = "<div class=\"search-footprint\" style=\"width:".concat(widthPx.toFixed(1), "px;height:").concat(heightPx.toFixed(1), "px;\"></div><div class=\"search-crosshair\"></div><div class=\"map-scale\">100m \u00D7 50m</div>");
        }
        return "<div class=\"tile-map\">\n      ".concat(tiles, "\n      <div class=\"tile-overlay\"></div>\n      ").concat(markerHtml, "\n      ").concat(footprintHtml, "\n      <div class=\"map-attribution\">").concat(mode === 'home' ? 'Korean Peninsula · ' : '', "Sentinel-2 Cloudless 2024</div>\n    </div>");
    }
    function lonLatToPixels(lon, lat, zoom) {
        var sinLat = Math.sin(lat * Math.PI / 180);
        var mapSize = 256 * (Math.pow(2, zoom));
        var x = ((lon + 180) / 360) * mapSize;
        var y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * mapSize;
        return { x: x, y: y };
    }
    function lineChart(rows, xKey, yKey, options) {
        if (options === void 0) { options = {}; }
        var data = rows.filter(function (row) { return Number.isFinite(Number(row[yKey])); });
        if (!data.length)
            return '<p class="subtle">차트 데이터가 없습니다.</p>';
        var width = 640;
        var height = 235;
        var pad = { left: 42, right: 18, top: 18, bottom: 36 };
        var values = data.map(function (row) { return Number(row[yKey]); });
        var min = Math.min.apply(Math, values);
        var max = Math.max.apply(Math, values);
        var yMin = min === max ? min - 1 : min;
        var yMax = min === max ? max + 1 : max;
        var points = data.map(function (row, index) {
            var x = pad.left + (index / Math.max(data.length - 1, 1)) * (width - pad.left - pad.right);
            var y = pad.top + (1 - ((Number(row[yKey]) - yMin) / (yMax - yMin))) * (height - pad.top - pad.bottom);
            return { x: x, y: y, label: row[xKey], value: Number(row[yKey]) };
        });
        var line = points.map(function (point) { return "".concat(point.x.toFixed(1), ",").concat(point.y.toFixed(1)); }).join(' ');
        var area = "".concat(pad.left, ",").concat(height - pad.bottom, " ").concat(line, " ").concat(width - pad.right, ",").concat(height - pad.bottom);
        var color = options.color || '#0f8f59';
        var ticks = [0, 0.5, 1].map(function (t) {
            var y = pad.top + t * (height - pad.top - pad.bottom);
            var val = yMax - t * (yMax - yMin);
            return "<line class=\"chart-grid\" x1=\"".concat(pad.left, "\" x2=\"").concat(width - pad.right, "\" y1=\"").concat(y, "\" y2=\"").concat(y, "\"/><text class=\"chart-label\" x=\"6\" y=\"").concat(y + 4, "\">").concat(formatNumber(val, 1), "</text>");
        }).join('');
        return "<svg class=\"chart-svg\" viewBox=\"0 0 ".concat(width, " ").concat(height, "\" role=\"img\">\n      ").concat(ticks, "\n      <line class=\"chart-axis\" x1=\"").concat(pad.left, "\" y1=\"").concat(height - pad.bottom, "\" x2=\"").concat(width - pad.right, "\" y2=\"").concat(height - pad.bottom, "\" />\n      ").concat(options.area ? "<polygon class=\"chart-area\" points=\"".concat(area, "\" fill=\"").concat(color, "\"></polygon>") : '', "\n      <polyline class=\"chart-line\" points=\"").concat(line, "\" stroke=\"").concat(color, "\"></polyline>\n      ").concat(points.filter(function (_, i) { return i % Math.ceil(points.length / 12) === 0 || i === points.length - 1; }).map(function (point) { return "<circle class=\"chart-dot\" cx=\"".concat(point.x, "\" cy=\"").concat(point.y, "\" r=\"4\" fill=\"").concat(color, "\"><title>").concat(point.label, ": ").concat(formatNumber(point.value, 3), " ").concat(options.unit || '', "</title></circle>"); }).join(''), "\n      <text class=\"chart-label\" x=\"").concat(pad.left, "\" y=\"").concat(height - 9, "\">").concat(htmlEscape(data[0][xKey]), "</text>\n      <text class=\"chart-label\" x=\"").concat(width - pad.right - 84, "\" y=\"").concat(height - 9, "\">").concat(htmlEscape(data[data.length - 1][xKey]), "</text>\n      <text class=\"chart-label\" x=\"").concat(width - pad.right - 90, "\" y=\"18\">").concat(htmlEscape(options.unit || ''), "</text>\n    </svg>");
    }
    function dualLineChart(rows, xKey, yKeyA, yKeyB, options) {
        if (options === void 0) { options = {}; }
        var data = rows.filter(function (row) { return Number.isFinite(Number(row[yKeyA])) && Number.isFinite(Number(row[yKeyB])); });
        if (!data.length)
            return '<p class="subtle">차트 데이터가 없습니다.</p>';
        var width = 640;
        var height = 235;
        var pad = { left: 42, right: 18, top: 24, bottom: 36 };
        var values = data.flatMap(function (row) { return [Number(row[yKeyA]), Number(row[yKeyB])]; });
        var min = Math.min.apply(Math, values);
        var max = Math.max.apply(Math, values);
        var yMin = min === max ? min - 1 : min;
        var yMax = min === max ? max + 1 : max;
        function pointsFor(key) {
            return data.map(function (row, index) {
                var x = pad.left + (index / Math.max(data.length - 1, 1)) * (width - pad.left - pad.right);
                var y = pad.top + (1 - ((Number(row[key]) - yMin) / (yMax - yMin))) * (height - pad.top - pad.bottom);
                return { x: x, y: y, label: row[xKey], value: Number(row[key]) };
            });
        }
        var ptsA = pointsFor(yKeyA);
        var ptsB = pointsFor(yKeyB);
        var lineA = ptsA.map(function (point) { return "".concat(point.x.toFixed(1), ",").concat(point.y.toFixed(1)); }).join(' ');
        var lineB = ptsB.map(function (point) { return "".concat(point.x.toFixed(1), ",").concat(point.y.toFixed(1)); }).join(' ');
        var colorA = options.colorA || '#0f8f59';
        var colorB = options.colorB || '#e2a229';
        var ticks = [0, 0.5, 1].map(function (t) {
            var y = pad.top + t * (height - pad.top - pad.bottom);
            var val = yMax - t * (yMax - yMin);
            return "<line class=\"chart-grid\" x1=\"".concat(pad.left, "\" x2=\"").concat(width - pad.right, "\" y1=\"").concat(y, "\" y2=\"").concat(y, "\"/><text class=\"chart-label\" x=\"6\" y=\"").concat(y + 4, "\">").concat(formatNumber(val, 1), "</text>");
        }).join('');
        return "<svg class=\"chart-svg\" viewBox=\"0 0 ".concat(width, " ").concat(height, "\" role=\"img\">\n      ").concat(ticks, "\n      <line class=\"chart-axis\" x1=\"").concat(pad.left, "\" y1=\"").concat(height - pad.bottom, "\" x2=\"").concat(width - pad.right, "\" y2=\"").concat(height - pad.bottom, "\" />\n      <polyline class=\"chart-line\" points=\"").concat(lineA, "\" stroke=\"").concat(colorA, "\"></polyline>\n      <polyline class=\"chart-line\" points=\"").concat(lineB, "\" stroke=\"").concat(colorB, "\"></polyline>\n      <circle cx=\"").concat(pad.left, "\" cy=\"13\" r=\"5\" fill=\"").concat(colorA, "\"></circle><text class=\"chart-label\" x=\"").concat(pad.left + 10, "\" y=\"17\">").concat(htmlEscape(options.labelA || yKeyA), "</text>\n      <circle cx=\"").concat(pad.left + 128, "\" cy=\"13\" r=\"5\" fill=\"").concat(colorB, "\"></circle><text class=\"chart-label\" x=\"").concat(pad.left + 138, "\" y=\"17\">").concat(htmlEscape(options.labelB || yKeyB), "</text>\n      <text class=\"chart-label\" x=\"").concat(pad.left, "\" y=\"").concat(height - 9, "\">").concat(htmlEscape(data[0][xKey]), "</text>\n      <text class=\"chart-label\" x=\"").concat(width - pad.right - 84, "\" y=\"").concat(height - 9, "\">").concat(htmlEscape(data[data.length - 1][xKey]), "</text>\n      <text class=\"chart-label\" x=\"").concat(width - pad.right - 90, "\" y=\"18\">").concat(htmlEscape(options.unit || ''), "</text>\n    </svg>");
    }
    function parseCsv(text) {
        var lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        if (lines.length < 2)
            throw new Error('CSV 행이 부족합니다.');
        var headers = parseCsvLine(lines[0]).map(function (header) { return header.trim(); });
        var rows = lines.slice(1).map(function (line) {
            var values = parseCsvLine(line);
            return Object.fromEntries(headers.map(function (header, index) { var _a; return [header, (_a = values[index]) !== null && _a !== void 0 ? _a : '']; }));
        });
        return normalizeCsvRows(rows);
    }
    function parseCsvLine(line) {
        var result = [];
        var current = '';
        var inQuotes = false;
        for (var i = 0; i < line.length; i += 1) {
            var char = line[i];
            if (char === '"' && line[i + 1] === '"') {
                current += '"';
                i += 1;
                continue;
            }
            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
                continue;
            }
            current += char;
        }
        result.push(current);
        return result;
    }
    function normalizeCsvRows(rows) {
        var aliases = {
            lat: ['위도', 'lat', 'latitude', 'Latitude'],
            lon: ['경도', 'lon', 'lng', 'longitude', 'Longitude'],
            startTime: ['시작시간', 'startTime', 'start_time', 'start', 'Start'],
            endTime: ['종료시간', 'endTime', 'end_time', 'end', 'End'],
            ch4Estimated: ['CH4_추정량', 'ch4Estimated', 'CH4', 'ch4', 'prediction']
        };
        function pick(row, key) {
            var name = aliases[key].find(function (candidate) { return Object.prototype.hasOwnProperty.call(row, candidate); });
            return name ? row[name] : '';
        }
        var normalized = rows.map(function (row) { return ({
            lat: Number(pick(row, 'lat')),
            lon: Number(pick(row, 'lon')),
            startTime: String(pick(row, 'startTime')).trim(),
            endTime: String(pick(row, 'endTime')).trim(),
            ch4Estimated: Number(pick(row, 'ch4Estimated'))
        }); }).filter(function (row) { return Number.isFinite(row.lat) && Number.isFinite(row.lon) && row.startTime && row.endTime && Number.isFinite(row.ch4Estimated); });
        if (!normalized.length)
            throw new Error('필수 컬럼을 찾지 못했습니다. 위도, 경도, 시작시간, 종료시간, CH4_추정량이 필요합니다.');
        return normalized;
    }
    function findDuplicateKeys(rows) {
        var groups = new Map();
        rows.forEach(function (row, index) {
            var key = "".concat(row.lat.toFixed(6), "|").concat(row.lon.toFixed(6), "|").concat(row.startTime, "|").concat(row.endTime);
            if (!groups.has(key))
                groups.set(key, []);
            groups.get(key).push({ row: row, index: index });
        });
        return Array.from(groups.entries()).filter(function (_a) {
            var items = _a[1];
            return items.length > 1;
        }).map(function (_a) {
            var key = _a[0], items = _a[1];
            return ({ key: key, count: items.length, items: items });
        });
    }
    function resolveDuplicateRows(rows, mode) {
        var groups = new Map();
        rows.forEach(function (row) {
            var key = "".concat(row.lat.toFixed(6), "|").concat(row.lon.toFixed(6), "|").concat(row.startTime, "|").concat(row.endTime);
            if (!groups.has(key))
                groups.set(key, []);
            groups.get(key).push(row);
        });
        var resolved = [];
        groups.forEach(function (items) {
            if (items.length === 1) {
                resolved.push(items[0]);
                return;
            }
            if (mode === 'last') {
                resolved.push(items[items.length - 1]);
                return;
            }
            if (mode === 'average') {
                var base = items[0];
                var avg = items.reduce(function (sum, row) { return sum + row.ch4Estimated; }, 0) / items.length;
                resolved.push(__assign(__assign({}, base), { ch4Estimated: avg }));
                return;
            }
            resolved.push(items[0]);
        });
        return resolved;
    }
    function showDuplicateModal(rows, duplicates) {
        var duplicateRows = duplicates.reduce(function (sum, group) { return sum + group.count - 1; }, 0);
        modalRoot.classList.add('show');
        modalRoot.innerHTML = "<div class=\"modal-backdrop\" role=\"dialog\" aria-modal=\"true\">\n      <div class=\"modal-card\">\n        <h2>\uC911\uBCF5 Key\uAC00 \uBC1C\uACAC\uB418\uC5C8\uC2B5\uB2C8\uB2E4</h2>\n        <p class=\"subtle mt-6\">\uB3D9\uC77C\uD55C <code>\uC704\uB3C4|\uACBD\uB3C4|\uC2DC\uC791\uC2DC\uAC04|\uC885\uB8CC\uC2DC\uAC04</code> \uC870\uD569\uC774 ".concat(formatNumber(duplicates.length), "\uAC1C \uADF8\uB8F9, \uC911\uBCF5 \uD589 ").concat(formatNumber(duplicateRows), "\uAC1C \uBC1C\uACAC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCC98\uB9AC \uBC29\uC2DD\uC744 \uC120\uD0DD\uD558\uC138\uC694.</p>\n        <div class=\"duplicate-list mt-14\">\n          ").concat(duplicates.slice(0, 18).map(function (group) { return "<div><code>".concat(htmlEscape(group.key), "</code> \u00B7 ").concat(group.count, " rows</div>"); }).join(''), "\n          ").concat(duplicates.length > 18 ? "<div>... \uC678 ".concat(duplicates.length - 18, "\uAC1C \uADF8\uB8F9</div>") : '', "\n        </div>\n        <div class=\"button-row mt-18\">\n          <button class=\"btn\" data-duplicate-mode=\"first\">\uCCAB \uD589 \uC720\uC9C0</button>\n          <button class=\"btn secondary\" data-duplicate-mode=\"last\">\uB9C8\uC9C0\uB9C9 \uD589 \uC720\uC9C0</button>\n          <button class=\"btn secondary\" data-duplicate-mode=\"average\">CH\u2084 \uD3C9\uADE0\uAC12 \uC0AC\uC6A9</button>\n          <button class=\"btn danger\" data-duplicate-mode=\"cancel\">\uC5C5\uB85C\uB4DC \uCDE8\uC18C</button>\n        </div>\n      </div>\n    </div>");
        modalRoot._pendingRows = rows;
    }
    function closeModal() {
        modalRoot.classList.remove('show');
        modalRoot.innerHTML = '';
        modalRoot._pendingRows = null;
    }
    function applyUploadedRows(rows, sourceLabel) {
        var _a;
        dataset = buildDatasetFromRows(rows, sourceLabel);
        localStorage.setItem(storageKeys.uploadedRows, JSON.stringify(rows));
        state.selectedFieldId = ((_a = dataset.fields[0]) === null || _a === void 0 ? void 0 : _a.parcelId) || '';
        state.dashboardMode = 'home';
        localStorage.setItem(storageKeys.selectedField, state.selectedFieldId);
        localStorage.setItem(storageKeys.dashboardMode, state.dashboardMode);
        toast("".concat(dataset.fields.length, "\uAC1C \uC704\uCE58, ").concat(dataset.predictions.length, "\uAC1C \uC608\uCE21 \uD589\uC744 \uBC18\uC601\uD588\uC2B5\uB2C8\uB2E4."));
        render();
    }
    function handleCsvUpload(event) {
        var _a;
        var file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var rows = parseCsv(String(reader.result || ''));
                var duplicates = findDuplicateKeys(rows);
                if (duplicates.length) {
                    showDuplicateModal(rows, duplicates);
                    return;
                }
                applyUploadedRows(rows, "Uploaded CSV: ".concat(file.name));
            }
            catch (error) {
                toast(error.message || 'CSV 처리 중 오류가 발생했습니다.');
            }
        };
        reader.readAsText(file, 'utf-8');
    }
    function downloadBlob(filename, text, type) {
        var blob = new Blob([text], { type: type });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
    function downloadNormalizedCsv() {
        var header = ['위도', '경도', '시작시간', '종료시간', 'CH4_추정량'];
        var lines = [header.join(',')].concat(dataset.predictions.map(function (row) { return [row.lat, row.lon, row.startTime, row.endTime, row.ch4Estimated].map(csvCell).join(','); }));
        downloadBlob('agri-i-normalized-ch4_predictions.csv', lines.join('\n'), 'text/csv;charset=utf-8');
    }
    function downloadClimateCsv() {
        var header = ['parcelId', 'lat', 'lon', 'startTime', 'endTime', 'temperatureC', 'rainfallMm', 'normalTemperatureC', 'previousYearTemperatureC', 'normalRainfallMm', 'previousYearRainfallMm', 'source', 'dataPath'];
        var lines = [header.join(',')].concat(dataset.climate.map(function (row) { return header.map(function (key) { return csvCell(row[key]); }).join(','); }));
        downloadBlob('climate_observations.csv', lines.join('\n'), 'text/csv;charset=utf-8');
    }
    function exportFieldData(parcelId) {
        var payload = { field: getField(parcelId), predictions: getPredictions(parcelId), climate: getClimate(parcelId), evidence: getEvidence(parcelId) };
        downloadBlob("".concat(parcelId, "-dmrv-data.json"), JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    }
    function downloadReportJson() {
        var lot = dataset.buyerLots.find(function (item) { return item.lotId === state.selectedLotId; }) || dataset.buyerLots[0];
        var payload = { lot: lot, fields: dataset.fields.filter(function (field) { return lot.parcelIds.includes(field.parcelId); }), evidence: dataset.evidence.filter(function (row) { return lot.parcelIds.includes(row.parcelId); }) };
        downloadBlob("".concat(lot.lotId, "-buyer-report-mockup.json"), JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    }
    function setupStaticEvents() {
        window.addEventListener('hashchange', render);
        document.querySelector('.brand').addEventListener('click', function () { location.hash = '#/'; });
        resetDemoBtn.addEventListener('click', function () {
            localStorage.removeItem(storageKeys.uploadedRows);
            localStorage.removeItem(storageKeys.selectedField);
            localStorage.removeItem(storageKeys.dashboardMode);
            dataset = buildDatasetFromStaticData();
            state.selectedFieldId = dataset.fields[0].parcelId;
            state.dashboardMode = 'home';
            toast('업로드 데이터를 초기화하고 기본 ch4_predictions.csv로 복원했습니다.');
            render();
        });
        app.addEventListener('click', function (event) {
            var selectField = event.target.closest('[data-select-field]');
            if (selectField) {
                var fieldId = selectField.getAttribute('data-select-field');
                var context = selectField.getAttribute('data-context');
                setSelectedField(fieldId, context === 'dashboard' || context === 'map' || context === 'table' ? 'result' : undefined);
                return;
            }
            var actionEl = event.target.closest('[data-action]');
            if (actionEl) {
                var action = actionEl.getAttribute('data-action');
                if (action === 'dashboard-home') {
                    state.dashboardMode = 'home';
                    localStorage.setItem(storageKeys.dashboardMode, 'home');
                    render();
                }
                if (action === 'download-normalized-csv')
                    downloadNormalizedCsv();
                if (action === 'download-climate-csv')
                    downloadClimateCsv();
                if (action === 'clear-uploaded-csv') {
                    localStorage.removeItem(storageKeys.uploadedRows);
                    dataset = buildDatasetFromStaticData();
                    state.selectedFieldId = dataset.fields[0].parcelId;
                    toast('업로드 CSV를 초기화했습니다.');
                    render();
                }
                if (action === 'print-report')
                    window.print();
                if (action === 'download-report-json')
                    downloadReportJson();
                return;
            }
            var routeEl = event.target.closest('[data-route-to]');
            if (routeEl) {
                location.hash = "#/".concat(routeEl.getAttribute('data-route-to'));
                return;
            }
            var downloadField = event.target.closest('[data-download-field]');
            if (downloadField) {
                exportFieldData(downloadField.getAttribute('data-download-field'));
            }
        });
        app.addEventListener('input', function (event) {
            var fieldSearch = event.target.getAttribute('data-field-search');
            if (fieldSearch) {
                state.fieldSearch[fieldSearch] = event.target.value;
                render();
            }
            if (event.target.getAttribute('data-input') === 'data-search') {
                state.dataSearch = event.target.value;
                render();
            }
        });
        app.addEventListener('change', function (event) {
            if (event.target.id === 'ch4CsvInput')
                handleCsvUpload(event);
        });
        modalRoot.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-duplicate-mode]');
            if (!btn)
                return;
            var mode = btn.getAttribute('data-duplicate-mode');
            var rows = modalRoot._pendingRows || [];
            if (mode === 'cancel') {
                closeModal();
                toast('CSV 업로드를 취소했습니다.');
                return;
            }
            var resolved = resolveDuplicateRows(rows, mode);
            closeModal();
            applyUploadedRows(resolved, "Uploaded CSV (".concat(mode, " duplicate resolution)"));
        });
    }
    setupStaticEvents();
    render();
})();
