# Agri-I AWD dMRV Dashboard Prototype

피드백 반영 버전입니다. GitHub Pages에서 바로 배포할 수 있는 정적 웹앱입니다.

## 반영 사항

- `2.jpg`를 `assets/images/agri-i-logo.jpg`로 반영했고, 사이드바/파비콘용 정사각 크롭 `assets/images/agri-i-logo-square.jpg`도 생성했습니다.
- Scenario 선택 옵션을 제거했습니다.
- 필지 수는 `ch4_predictions.csv`의 고유 위도/경도 위치 수로 계산합니다.
- 기존 `Parcels` 패널을 `Data Processing` 패널로 변경했습니다.
- `위도|경도|시작시간|종료시간`을 Key로 사용하고, 중복 Key 발견 시 관리자 선택 모달을 띄웁니다.
- `AWD Score`는 실제 인증 점수가 아니라 CSV 기반 상대지표이므로 화면 전체에 `AWD Score (for example)` 또는 `for example` 태그를 표시했습니다.
- Dashboard는 `Home`과 `Search Result` 두 형태로 구성했습니다.
  - Home: 한반도 전체 Sentinel-2 Cloudless 위성뷰, 전체 요약, AWD 점검 대상, 한국 기후 데이터.
  - Search Result: 선택 부지 중심 Sentinel-2 위성뷰와 100m × 50m footprint, 지역 기후 데이터, 감축량 요약.
- Monitoring/Evidence의 필드 선택 UI를 검색형으로 변경했습니다. 검색은 위도, 경도, 지역, 일련번호, Field ID로 가능합니다.
- Temperature/Rainfall 그래프는 `data/climate_observations.csv`를 사용하며, 그래프에 데이터 위치와 출처를 표시합니다.

## 파일 구조

```text
agri-i-awd-dmrv-dashboard/
├─ index.html
├─ assets/
│  ├─ css/styles.css
│  ├─ images/agri-i-logo.jpg
│  ├─ images/agri-i-logo-square.jpg
│  └─ js/
│     ├─ app.js
│     ├─ data.js
│     └─ gee-config.js
├─ data/
│  ├─ ch4_predictions.csv
│  ├─ climate_observations.csv
│  ├─ korea_climate_summary.csv
│  ├─ parcels.geojson
│  ├─ observations.json
│  ├─ evidence.json
│  └─ buyer_lots.json
├─ .github/workflows/pages.yml
├─ .nojekyll
├─ package.json
└─ README.md
```

## 로컬 실행

```bash
npm run start
```

또는

```bash
python3 -m http.server 5173
```

브라우저에서 `http://localhost:5173` 접속.

## 문법 검사

```bash
npm run check
```

## GitHub Pages 배포

```bash
git init
git add .
git commit -m "Update Agri-I feedback build"
git branch -M main
git remote add origin https://github.com/<YOUR_ACCOUNT>/<YOUR_REPO>.git
git push -u origin main
```

GitHub repository에서 `Settings → Pages → Source: GitHub Actions`를 선택하면 됩니다.

## CSV 입력 구조

`Data Processing` 화면에서 업로드할 CSV는 아래 구조를 사용합니다.

```csv
위도,경도,시작시간,종료시간,CH4_추정량
34.75,126.5,2025-01-01,2025-01-07,10.716751
```

중복 Key는 다음 조합입니다.

```text
위도|경도|시작시간|종료시간
```

중복 발견 시 선택 가능한 처리 방식:

- 첫 행 유지
- 마지막 행 유지
- CH4 평균값 사용
- 업로드 취소

## 데이터 출처 표기

현재 웹앱에는 세 종류의 데이터 출처 표기가 들어갑니다.

1. CH4 prediction: `data/ch4_predictions.csv` — 사용자 제공 CSV.
2. Satellite view: Sentinel-2 Cloudless 2024 by EOX. Contains modified Copernicus Sentinel data 2024.
3. Climate chart: `data/climate_observations.csv` — 데모 CSV. 실제 서비스에서는 Copernicus ERA5 single-levels 또는 기상청 ASOS/AWS 자료로 교체하는 구조입니다.

## GEE API 메모

현재 빌드는 비용과 키 노출 리스크를 줄이기 위해 API Key가 필요 없는 Sentinel-2 Cloudless tile layer를 사용합니다. `assets/js/gee-config.js`는 GEE 전환용 자리만 마련해둔 파일입니다.

GitHub Pages에서 직접 GEE live tile을 쓰려면 일반적으로 다음 설정이 필요합니다.

- Google Cloud Project ID
- Earth Engine API 사용 권한
- OAuth 2.0 Client ID
- Authorized JavaScript origins에 GitHub Pages 도메인 등록

실제 농가 개인정보, 계약정보, 원본 민감 좌표, API Key, `.env` 파일은 public repository에 커밋하지 마세요.
