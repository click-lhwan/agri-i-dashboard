# Agri-I AWD dMRV Dashboard Prototype

GitHub Pages에 바로 배포할 수 있는 정적 웹 프로토타입입니다. 서버, 데이터베이스, 로그인, API Key 없이 `index.html + assets + data`만으로 동작합니다.

## 구현 범위

- Landing
- Dashboard
- Parcels
- Monitoring
- Evidence Data Room
- 바이어 리포트(Mock-Up)
- Product Passport(Mock-Up)
- Methodology / Guide

## 실행 방법

로컬에서 확인하려면 저장소 루트에서 아래 명령을 실행합니다.

```bash
python3 -m http.server 5173
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:5173
```

파일을 더블클릭해도 기본 화면은 열리지만, 실제 배포 전에는 위 방식으로 확인하는 것을 권장합니다.

## GitHub Pages 배포

### 방법 A: GitHub Actions

1. GitHub에 public repository를 생성합니다.
2. 이 폴더의 모든 파일을 repository 루트에 커밋합니다.
3. Settings → Pages → Source를 `GitHub Actions`로 설정합니다.
4. main 브랜치에 push하면 `.github/workflows/pages.yml`이 자동 배포합니다.

### 방법 B: Branch 배포

1. Settings → Pages → Source를 `Deploy from a branch`로 설정합니다.
2. Branch는 `main`, folder는 `/root`를 선택합니다.
3. 저장 후 GitHub Pages URL로 접속합니다.

## 데이터 교체

앱은 기본적으로 `assets/js/data.js`의 `window.AGRII_DATA`를 읽어 동작합니다. 외부 fetch가 없어 GitHub Pages와 file preview 모두 안정적으로 열립니다.

보조 데이터 파일은 `data/`에 따로 포함되어 있습니다.

- `data/parcels.geojson`
- `data/observations.json`
- `data/evidence.json`
- `data/buyer_lots.json`
- `data/scenarios.json`

운영 전에는 실제 농가 개인정보, 원본 좌표, 연락처, 계약정보, 수익배분 정보, API Key를 절대 커밋하지 마세요. public repository를 기준으로 샘플·익명화 데이터만 사용해야 합니다.

## CSV Import 형식

Parcels 화면의 CSV 가져오기는 아래 열을 지원합니다.

```csv
parcelId,status,awdScore,evidenceRate,buyerCandidate
KR-RICE-001,AWD_GOOD,88,92,true
KR-RICE-002,WATCH,65,70,true
```

수정값은 서버에 저장되지 않고 브라우저 `localStorage`에만 저장됩니다.

## PDF 생성

바이어 리포트(Mock-Up) 화면에서 `PDF로 저장/인쇄` 버튼을 누른 뒤 브라우저 인쇄 창에서 `PDF로 저장`을 선택합니다. 서버 PDF 라이브러리를 쓰지 않습니다.

## 필요한 정보 / Key

- API Key: 필요 없음
- Server: 필요 없음
- Database: 필요 없음
- GitHub Secrets: 필요 없음
- Custom domain: 선택 사항
- 실제 지도 타일: 사용하지 않음
- 외부 CDN: 사용하지 않음

## 주의 문구

이 프로토타입은 공식 인증서 또는 탄소크레딧 발행 시스템이 아닙니다. AI/모델 결과는 MRV 자료 생성과 검증 비용 절감을 지원하는 보조 지표로만 표시해야 합니다.
