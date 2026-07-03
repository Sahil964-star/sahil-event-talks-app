import datetime
import hashlib
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Simple in-memory cache
cache = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 600  # 10 minutes cache duration in seconds

def fetch_and_parse_notes():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    response = requests.get(url, timeout=15)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch release notes: HTTP {response.status_code}")
        
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        iso_date = updated_elem.text if updated_elem is not None else ""
        
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        link = link_elem.attrib['href'] if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('atom:content', ns)
        content_html_raw = content_elem.text if content_elem is not None else ""
        
        # Parse the HTML content to extract individual updates
        soup = BeautifulSoup(content_html_raw, 'html.parser')
        h3s = soup.find_all('h3')
        
        if not h3s:
            # No h3 tags, treat all as one general update
            text_content = soup.get_text().strip()
            item_id = hashlib.md5(f"{date_str}-general-{text_content[:50]}".encode('utf-8')).hexdigest()
            entries.append({
                'id': item_id,
                'date': date_str,
                'iso_date': iso_date,
                'type': 'General',
                'content_html': str(soup).strip(),
                'content_text': text_content,
                'link': link
            })
            continue
            
        # Group siblings under each h3
        for h3 in h3s:
            update_type = h3.get_text().strip()
            
            # Find siblings until next h3
            siblings = []
            curr = h3.next_sibling
            while curr and curr.name != 'h3':
                siblings.append(curr)
                curr = curr.next_sibling
                
            html_content = "".join(str(s) for s in siblings).strip()
            
            # Reparse to get text content reliably
            sub_soup = BeautifulSoup(html_content, 'html.parser')
            text_content = sub_soup.get_text().strip()
            
            if not text_content:
                continue
                
            item_id = hashlib.md5(f"{date_str}-{update_type}-{text_content[:50]}".encode('utf-8')).hexdigest()
            entries.append({
                'id': item_id,
                'date': date_str,
                'iso_date': iso_date,
                'type': update_type,
                'content_html': html_content,
                'content_text': text_content,
                'link': f"{link}#{date_str.replace(' ', '_').replace(',', '')}_{update_type}" 
            })
            
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache['data'] or (current_time - cache['last_updated'] > CACHE_DURATION):
        try:
            # Simulate artificial latency for UI loader demonstration if force refresh is quick
            start_time = time.time()
            data = fetch_and_parse_notes()
            
            # Guarantee at least 800ms of loading spinner so the transition is smooth and satisfying
            elapsed = time.time() - start_time
            if elapsed < 0.8:
                time.sleep(0.8 - elapsed)
                
            cache['data'] = data
            cache['last_updated'] = current_time
            return jsonify({
                'success': True,
                'source': 'network',
                'data': data,
                'last_updated': datetime.datetime.fromtimestamp(current_time).isoformat()
            })
        except Exception as e:
            # If fetch fails but we have cached data, fallback to cache
            if cache['data']:
                return jsonify({
                    'success': True,
                    'source': 'cache_fallback',
                    'error': str(e),
                    'data': cache['data'],
                    'last_updated': datetime.datetime.fromtimestamp(cache['last_updated']).isoformat()
                })
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
            
    return jsonify({
        'success': True,
        'source': 'cache',
        'data': cache['data'],
        'last_updated': datetime.datetime.fromtimestamp(cache['last_updated']).isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
