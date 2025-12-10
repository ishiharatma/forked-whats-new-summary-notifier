#!/usr/bin/env python3
"""
get_azure_update_content関数のテスト用スクリプト
"""

import urllib.request
import urllib.error
import urllib.parse
import re
from bs4 import BeautifulSoup

class MockLogger:
    """Lambda PowertoolsのLoggerを模擬するクラス"""
    def info(self, msg):
        print(f"[INFO] {msg}")
    
    def warning(self, msg):
        print(f"[WARNING] {msg}")
    
    def error(self, msg):
        print(f"[ERROR] {msg}")

# グローバルなloggerを設定
logger = MockLogger()

def get_azure_update_content(url):
    """Retrieve the content of an Azure update page

    Args:
        url (str): The URL of the Azure update page (e.g., https://azure.microsoft.com/updates?id=xxxxx)

    Returns:
        str: The content of the Azure update, including title, category, and description
    """
    
    try:
        if url.lower().startswith(("http://", "https://")):
            # Use the `with` statement to ensure the response is properly closed
            with urllib.request.urlopen(url) as response:
                html = response.read()
                if response.getcode() == 200:
                    soup = BeautifulSoup(html, "html.parser")
                    
                    # Azure updatesページの特定要素を抽出
                    content_parts = []
                    
                    # URLからIDパラメータを抽出
                    parsed_url = urllib.parse.urlparse(url)
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    update_id = query_params.get('id', [None])[0]
                    
                    if update_id:
                        # 特定のIDに基づくアコーディオン要素を探す
                        accordion_id = f"accordion-{update_id}"
                        accordion_element = soup.find('div', id=accordion_id)
                        
                        logger.info(f"Looking for accordion element: {accordion_id}")
                        
                        if accordion_element:
                            logger.info(f"Found accordion element: {accordion_id}")
                            
                            # アコーディオン内のタイトルを探す
                            title_element = accordion_element.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                            if not title_element:
                                # ボタンやリンク内のタイトルも探す
                                title_element = accordion_element.find(['button', 'a'])
                            
                            if title_element:
                                content_parts.append(f"Title: {title_element.get_text(strip=True)}")
                            
                            # アコーディオン内のコンテンツを探す
                            content_div = accordion_element.find('div', class_=['collapse', 'accordion-collapse', 'content'])
                            if not content_div:
                                # より一般的なdiv要素を探す
                                content_divs = accordion_element.find_all('div')
                                if len(content_divs) > 1:
                                    content_div = content_divs[1]
                            
                            if content_div:
                                logger.info("Found content div within accordion")
                                
                                # ステータス情報の取得
                                status_elements = content_div.find_all(string=re.compile(r'LAUNCHED|IN PREVIEW|IN DEVELOPMENT|General availability|Preview|Public preview'))
                                if status_elements:
                                    content_parts.append(f"Status: {status_elements[0].strip()}")
                                
                                # メインコンテンツの取得
                                main_text = content_div.get_text(strip=True)
                                # 過度に長いテキストを制限
                                if len(main_text) > 2000:
                                    main_text = main_text[:2000] + "..."
                                content_parts.append(f"Description: {main_text}")
                            else:
                                logger.warning("No content div found in accordion")
                                # アコーディオン全体から取得を試みる
                                main_text = accordion_element.get_text(strip=True)
                                if len(main_text) > 2000:
                                    main_text = main_text[:2000] + "..."
                                content_parts.append(f"Description: {main_text}")
                            
                            return "\n\n".join(content_parts) if content_parts else None
                        
                        else:
                            logger.warning(f"Accordion element {accordion_id} not found")
                            # デバッグ: 存在するIDを探す
                            all_ids = [elem.get('id') for elem in soup.find_all(id=True)]
                            matching_ids = [id for id in all_ids if update_id in str(id)]
                            logger.info(f"Found IDs containing '{update_id}': {matching_ids}")
                    
                    # フォールバック: 一般的な方法でコンテンツを取得
                    logger.info("Falling back to general content extraction")
                    title_element = soup.find('h1') or soup.find('h2') or soup.find('h3')
                    if title_element:
                        content_parts.append(f"Title: {title_element.get_text(strip=True)}")
                    
                    main = soup.find("main")
                    if main:
                        main_text = main.get_text(strip=True)
                        if len(main_text) > 2000:
                            main_text = main_text[:2000] + "..."
                        content_parts.append(f"Description: {main_text}")
                    
                    return "\n\n".join(content_parts) if content_parts else None

        else:
            logger.warning(f"Invalid URL format: {url}")
            return None

    except urllib.error.URLError as e:
        logger.error(f"Error accessing {url}: {e.reason}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching Azure update content: {e}")
        return None

def test_azure_content_extraction():
    """Test function for Azure content extraction"""
    # 指定されたURLでテスト
    test_url = "https://azure.microsoft.com/updates?id=534523"
    
    print(f"\n=== Testing: {test_url} ===")
    print("=" * 80)
    
    content = get_azure_update_content(test_url)
    
    if content:
        print("✅ Content extracted successfully:")
        print("-" * 30)
        print(content)
    else:
        print("❌ Failed to extract content")
    
    return content

if __name__ == "__main__":
    test_azure_content_extraction()