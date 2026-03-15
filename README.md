# USOIL ATR Backtest System

一個以前後端分離方式實作的原油（USOIL）回測平台：

- **Backend（FastAPI + Pandas）**：讀取 tick CSV、重採樣成多週期 K 棒、計算指標、執行策略回測、輸出績效與曲線。
- **Frontend（React + Vite + lightweight-charts）**：顯示 K 線/ATR/權益/回撤圖，並提供參數面板一鍵回測。

---

## 專案架構

```text
AirQuant-interview-project/
├─ backend/
│  ├─ main.py                 # FastAPI 入口與 API 路由
│  ├─ data_processor.py       # Tick -> OHLCV 重採樣與資料管理
│  ├─ indicators.py           # ATR/Donchian/Keltner/EMA 指標
│  ├─ strategy.py             # S1/S2 策略邏輯與訊號產生
│  ├─ backtest_engine.py      # 交易模擬、資金曲線、回撤、績效統計
│  ├─ tests/                  # pytest 測試（API/指標/策略/資料）
│  └─ requirements.txt        # Python 相依套件
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx              # 頁面組裝與資料流
│  │  ├─ services/api.js      # 前端 API client（預設指向 localhost:8000）
│  │  └─ components/
│  │     ├─ Chart.jsx         # 主圖、ATR 圖、權益+回撤圖
│  │     ├─ ParameterPanel.jsx# 回測參數輸入面板
│  │     ├─ TimeframeSelector.jsx
│  │     └─ MetricsPanel.jsx
│  ├─ package.json            # 前端腳本與依賴
│  └─ vite.config.js
├─ data/
│  └─ .gitkeep                # 資料目錄（需自行放 USOIL CSV）
└─ LICENSE
```

---

## 系統需求

- Python **3.10+**（建議 3.11）
- Node.js **18+**（建議 20 LTS）
- npm（隨 Node 安裝）

---

## 資料格式與檔案放置

後端會從 `data/` 讀取以下檔案：

- `data/USOIL_1y_24.csv`
- `data/USOIL_1y_25.csv`

CSV 至少需要欄位：

- `time`：Unix timestamp（秒）
- `bid`：買價
- `ask`：賣價

後端會自動計算中間價 `mid_price=(bid+ask)/2`，再重採樣成 OHLCV。

---

## Quick Start

### 1) 啟動 Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 可選：建立 .env（見下方環境變數）
# echo "FAKE_TRADING=false" > .env

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

啟動後可開啟 API 文件：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 2) 啟動 Frontend

另開一個終端：

```bash
cd frontend
npm install
npm run dev
```

預設前端網址：`http://localhost:5173`

> 前端 API base URL 目前寫死為 `http://localhost:8000`，若後端改 port/host，請同步修改 `frontend/src/services/api.js`。

### 3) 開始回測

1. 選擇年份（2024 訓練 / 2025 驗證）
2. 選擇 timeframe（1m ~ 3d）
3. 選擇策略（S1 或 S2）
4. 調整參數後按 **Run Backtest**

---

## 可操作變數（環境變數）

目前後端有一個環境變數：

| 變數 | 預設值 | 說明 |
|---|---:|---|
| `FAKE_TRADING` | `false` | 設為 `true` 時，交易損益與部分績效會使用隨機模擬值（展示模式），不反映真實策略結果。 |

範例：

```bash
# backend/.env
FAKE_TRADING=true
```

---

## 可操作變數（回測參數）

以下參數由前端送至 `POST /api/backtest`：

### 通用參數（S1/S2 共用）

| 參數 | 型別 | 預設值 | 說明 |
|---|---|---:|---|
| `year` | string | `"24"` | 資料年別，`24` 或 `25` |
| `timeframe` | string | `"1h"` | K 棒週期：`1m/5m/15m/30m/1h/4h/1d/3d` |
| `strategy_type` | string | `"s1"` | 策略類型：`s1`（ATR Breakout）或 `s2`（Keltner Mean Reversion） |
| `atr_period` | int | `14` | ATR 週期 |
| `stop_multiplier` | float | `2.0` | 停損 ATR 倍數 |
| `profit_multiplier` | float | `3.0` | 止盈 ATR 倍數（模式相關） |
| `leverage` | int | `10` | 槓桿倍數 |
| `risk_per_trade` | float | `0.02` | 單筆風險（比例，例如 0.02=2%） |
| `initial_capital` | float | `100000` | 初始資金 |
| `spread` | float | `0.04` | 點差成本 |

### S1（ATR Breakout）專用

| 參數 | 型別 | 預設值 | 說明 |
|---|---|---:|---|
| `breakout_period` | int | `20` | Donchian 通道週期 |
| `entry_multiplier` | float | `0.5` | 進場門檻 ATR 倍數 |

### S2（Keltner Mean Reversion）專用

| 參數 | 型別 | 預設值 | 說明 |
|---|---|---:|---|
| `kc_basis_period` | int | `20` | Keltner basis EMA 週期 |
| `kc_mult` | float | `2.0` | Keltner band ATR 倍數 |
| `profit_mode` | string | `"to_basis"` | `to_basis` / `fixed_atr` / `trailing` |
| `big_stop_multiplier` | float | `0` | 災難停損 ATR 倍數，`0` 代表停用 |
| `max_hold_bars` | int | `100` | 最長持倉 K 數 |
| `trend_filter_period` | int | `100` | 趨勢 EMA 週期 |
| `vol_lookback` | int | `200` | 波動率歷史回看期 |
| `vol_ratio_max` | float | `1.0` | ATR ratio 上限濾網 |
| `max_consecutive_losses` | int | `3` | 連敗上限 |
| `cooldown_bars` | int | `5` | 連敗後冷卻 K 數 |

---

## API 快覽

### `GET /api/timeframes`
取得可用時間週期。

### `GET /api/years`
取得可用資料年別（24/25）。

### `GET /api/ohlcv/{year}?timeframe=1h&atr_period=14`
取得指定年別與週期的 OHLCV + ATR 資料。

### `POST /api/backtest`
使用請求參數執行回測，回傳：

- `metrics`：年化報酬、最大回撤、Sharpe、Sortino、勝率、PF…
- `signals`：買賣/平倉訊號
- `equity_curve`：權益曲線
- `drawdown_curve`：回撤曲線
- `drawdown_markers`：最大回撤開始/谷底/恢復點

---

## 測試

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm test
```

---

## 常見問題

### 1) 前端顯示「Failed to load chart data」
- 確認 backend 是否跑在 `http://localhost:8000`
- 確認 `data/USOIL_1y_24.csv` / `USOIL_1y_25.csv` 是否存在且格式正確

### 2) 回測結果異常漂亮/不合理
- 檢查是否啟用了 `FAKE_TRADING=true`

### 3) 更改後端位址或 port
- 修改 `frontend/src/services/api.js` 內 `API_BASE`

---

## License

本專案採用 `LICENSE` 檔案所述授權條款。
