# BigQuery Release Notes Explorer

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![Flask 3.0.3](https://img.shields.io/badge/flask-3.0.3-emerald.svg)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, high-performance web dashboard that fetches, parses, searches, filters, and shares Google BigQuery release notes. Built using a **Python Flask** backend and a responsive **Vanilla HTML5, JavaScript, and CSS3** frontend.

---

## 🌟 Key Features

*   **Atomic Note Splitting:** Automatically parses Google Cloud's consolidated XML Atom feed and splits updates by heading type (`Feature`, `Change`, `Deprecated`, `Bug Fix`), converting them into individual, shareable cards.
*   **Real-time Searching:** Instant character matching across release dates, titles, and text contents.
*   **Multi-Category Filtering:** Clean glassmorphic category selection pills with colored neon left borders mapping to specific update severity types.
*   **Interactive Tweet Composer Modal:**
    *   Generates pre-formatted tweet drafts containing standard headers, links, and tags within the 280-character limit.
    *   Tracks character limits in real-time and warns users visually if modifications exceed X (Twitter) constraints.
    *   Interactive hashtag selector pills that seamlessly append or remove tags in the composer area.
*   **Resilient In-Memory Caching:** Caches retrieved updates locally for 10 minutes to minimize external calls and load times, with automatic grace-falls to cache if Google's feed is temporarily unreachable.
*   **Artificial Spinner Latency:** Guarantees a minimum 800ms animation buffer on forced syncs to ensure loading transitions remain visually satisfying and smooth.

---

## 🛠️ Tech Stack

*   **Backend:** Python 3, Flask, Requests, BeautifulSoup4, ElementTree XML parser.
*   **Frontend:** HTML5, CSS3 Custom Properties (variables), Vanilla JavaScript (ES6+), Google Fonts (Outfit & JetBrains Mono).
*   **Integration:** Twitter Web Intent API.

---

## 📂 Project Structure

```
bq-releases-notes/
├── app.py                  # Flask server application & XML-to-JSON parsing engine
├── requirements.txt        # Python dependency manifest
├── .gitignore              # Configured Git tracking exclusion patterns
├── README.md               # User manual and project description
├── templates/
│   └── index.html          # Semantic HTML SPA layout & Composer modal structures
└── static/
    ├── css/
    │   └── style.css       # Visual layout, neon themes, blurred backgrounds & animations
    └── js/
        └── app.js          # DOM manipulation, REST client, and Tweet composer controller
```

---

## 🚀 Getting Started

Follow these instructions to run the application locally on your machine.

### Prerequisites
*   Python 3.8 or higher installed on your system.

### 1. Set Up Environment
Create and activate a virtual environment to manage dependencies locally:
```bash
# Initialize virtual environment
python -m venv venv

# Activate on Windows:
venv\Scripts\activate

# Activate on macOS/Linux:
source venv/bin/activate
```

### 2. Install Packages
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Run the Web Server
Launch the Flask development server:
```bash
python app.py
```

Open your browser and navigate to **`http://127.0.0.1:5000`** to view the application.

---

## ⚙️ How it Works

### 1. Backend Processing (`app.py`)
1.  **Request:** The application pulls down the Google BigQuery Atom feed XML.
2.  **Atom Parsing:** Parses entry metadata (like title date and link anchors) using Python's `ElementTree`.
3.  **BeautifulSoup Segmenting:** Splice the raw HTML code by locating `<h3>` tags. It gathers all sibling tags (`<p>`, `<ul>`, `<code>`) under each header, dividing a single day's updates into separate, categorized objects.
4.  **Hashing:** Assigns a unique MD5 hash string based on the entry parameters to serve as a card ID.

### 2. Client Rendering (`app.js` & `style.css`)
1.  **Dynamic Rendering:** Grabs updates from `/api/release-notes` and injects them as grid cards.
2.  **Neon UI Coding:** Applies colored neon borders and custom badges dynamically according to the category:
    *   🟢 **Feature:** Green (`#10b981`)
    *   🔵 **Change:** Cyan (`#06b6d4`)
    *   🔴 **Deprecated:** Red (`#f43f5e`)
    *   🟣 **Bug Fix:** Purple (`#8b5cf6`)
3.  **Tweet Intent Mapping:** Translates card data into standard layouts. When users click **Tweet**, it opens the custom compositor modal, computes character balances in real-time, and opens a new window directed to the Twitter intent system for secure posting.
